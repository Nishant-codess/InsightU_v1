import { parse } from 'csv-parse';
import prisma from '../../config/database';

export interface ExamMetadata {
  teacherId: string;
  subject: string;
  examName: string;
  examDate: Date;
  totalMarks: number;
  questions: Array<{ qNo: number; topic: string; maxMarks: number }>;
}

export async function uploadExamSettings(metadata: ExamMetadata) {
  if (!metadata.subject || !metadata.examName || !metadata.examDate) {
    throw new Error('Missing required exam metadata');
  }

  return prisma.exam.create({
    data: {
      teacherId: metadata.teacherId,
      subject: metadata.subject,
      examName: metadata.examName,
      examDate: metadata.examDate,
      totalMarks: metadata.totalMarks,
      questions: metadata.questions as any,
    },
  });
}

// Requirement 9: Handles CSV buffering interpreting registrations mapped linearly to topic evaluations
export async function processExamMarksCsv(examId: string, csvBuffer: Buffer) {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) throw new Error('Exam not found');

  return new Promise((resolve, reject) => {
    parse(csvBuffer, { columns: true, skip_empty_lines: true }, async (err, rawRecords) => {
      if (err) return reject(err);

      const records = rawRecords as Record<string, string>[];
      const unmatchedRegistrations: string[] = [];
      const stats = { processed: 0, failed: 0 };

      for (const record of records) {
        const regNo = record['RegistrationNumber'] || record['registrationNumber'];
        if (!regNo) continue;

        const student = await prisma.student.findUnique({ where: { registrationNumber: regNo } });
        
        // Req 9.5: Unmatched skip parsing rather than fatal crash
        if (!student) {
          unmatchedRegistrations.push(regNo);
          stats.failed++;
          continue;
        }

        // Parse question scores dynamically from CSV (e.g. Q1, Q2)
        const questionMarks: Record<string, number> = {};
        const topicScores: Record<string, { earned: number; max: number }> = {};
        let totalScored = 0;

        const examQuestions = exam.questions as Array<{ qNo: number; topic: string; maxMarks: number }>;

        for (const q of examQuestions) {
          const score = parseFloat(record[`Q${q.qNo}`] || '0');
          questionMarks[`Q${q.qNo}`] = score;
          totalScored += score;

          if (!topicScores[q.topic]) {
            topicScores[q.topic] = { earned: 0, max: 0 };
          }
          topicScores[q.topic].earned += score;
          topicScores[q.topic].max += q.maxMarks;
        }

        const percentage = (totalScored / exam.totalMarks) * 100;

        // Persist exam record explicitly
        await prisma.studentExamMarks.create({
          data: {
            examId: exam.id,
            studentId: student.id,
            questionMarks,
            topicScores,
            totalMarks: totalScored,
            percentage,
          }
        });

        // Requirement 9.6: Topic Analytics ingestion
        const topicIntegrations = Object.entries(topicScores).map(([topic, data]) => ({
          studentId: student.id,
          subject: exam.subject,
          topic,
          assessmentType: 'EXAM',
          score: data.earned,
          maxScore: data.max,
          percentage: (data.earned / data.max) * 100,
          assessmentDate: exam.examDate
        }));

        await prisma.studentPerformance.createMany({ data: topicIntegrations });
        stats.processed++;
      }

      resolve({ stats, unmatchedRegistrations });
    });
  });
}
