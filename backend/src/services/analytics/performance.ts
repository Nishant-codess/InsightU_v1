import prisma from '../../config/database';

export interface TopicPerformance {
  topic: string;
  subject: string;
  averageScore: number;
  assessmentCount: number;
  status: 'strong' | 'weak' | 'neutral';
  recommendedNotes: string[];
}

export interface PerformanceTrend {
  date: Date;
  subject: string;
  score: number;
  assessmentType: string;
}

export interface StudyRecommendation {
  topic: string;
  subject: string;
  reason: string;
  recommendedNotes: any[];
  priority: 'high' | 'medium' | 'low';
}

export async function getStudentDashboard(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error('Student not found');

  const performances = await prisma.studentPerformance.findMany({
    where: { studentId },
    orderBy: { assessmentDate: 'asc' },
  });

  const subjectMarks: Record<string, { earned: number; max: number }> = {};
  const topicStats: Record<string, { subject: string, earned: number; max: number }> = {};
  
  let totalEarned = 0;
  let totalMax = 0;

  performances.forEach(perf => {
    if (!subjectMarks[perf.subject]) {
      subjectMarks[perf.subject] = { earned: 0, max: 0 };
    }
    subjectMarks[perf.subject].earned += perf.score;
    subjectMarks[perf.subject].max += perf.maxScore;

    const topicKey = `${perf.subject}:${perf.topic}`;
    if (!topicStats[topicKey]) {
      topicStats[topicKey] = { subject: perf.subject, earned: 0, max: 0 };
    }
    topicStats[topicKey].earned += perf.score;
    topicStats[topicKey].max += perf.maxScore;

    totalEarned += perf.score;
    totalMax += perf.maxScore;
  });

  const academicHealthScore = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

  const weakSubjects = Object.entries(subjectMarks)
    .filter(([_, stats]) => (stats.earned / stats.max) * 100 < 60)
    .map(([subject]) => subject);

  const weakTopics = Object.entries(topicStats)
    .filter(([_, stats]) => (stats.earned / stats.max) * 100 < 50)
    .map(([topicKey, stats]) => ({
       topic: topicKey.split(':')[1],
       subject: stats.subject,
    }));

  if (academicHealthScore > 0 && academicHealthScore < 55) {
      await prisma.notification.create({
          data: {
              userId: student.id,
              type: 'PERFORMANCE_ALERT',
              title: 'Academic Alert',
              message: 'Your overall academic health has fallen below recommended thresholds. Please review weak topics.',
          }
      })
  }

  const recommendations = weakTopics.map(wt => `Review Lecture Notes for ${wt.subject}: ${wt.topic}`);

  return {
    academicHealthScore,
    weakSubjects,
    weakTopics,
    recommendations, 
    subjectMarks,
    trends: performances
  };
}

export async function calculateAcademicHealthScore(studentId: string): Promise<number> {
  const performances = await prisma.studentPerformance.findMany({
    where: { studentId },
  });

  if (performances.length === 0) {
    await prisma.academicHealth.upsert({
      where: { studentId },
      update: { overallScore: 0, quizScore: 0, assignmentScore: 0, examScore: 0, consistencyScore: 0, weakSubjects: [], weakTopics: [], calculatedAt: new Date() },
      create: { studentId, overallScore: 0, quizScore: 0, assignmentScore: 0, examScore: 0, consistencyScore: 0, weakSubjects: [], weakTopics: [] },
    });
    return 0;
  }

  const quizPerfs = performances.filter(p => p.assessmentType.toLowerCase().includes('quiz'));
  const assignmentPerfs = performances.filter(p => p.assessmentType.toLowerCase().includes('assignment'));
  const examPerfs = performances.filter(p => p.assessmentType.toLowerCase().includes('exam'));

  const calcAvg = (perfs: typeof performances) => {
    if (perfs.length === 0) return 0;
    const totalScore = perfs.reduce((sum, p) => sum + p.score, 0);
    const totalMax = perfs.reduce((sum, p) => sum + p.maxScore, 0);
    return totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
  };

  const quizScore = calcAvg(quizPerfs);
  const assignmentScore = calcAvg(assignmentPerfs);
  const examScore = calcAvg(examPerfs);

  const weightedScore = quizScore * 0.3 + assignmentScore * 0.3 + examScore * 0.4;
  const clampedScore = Math.min(100, Math.max(0, weightedScore));

  const weakSubjects = await identifyWeakSubjects(studentId);
  const weakTopics = await identifyWeakTopics(studentId);

  await prisma.academicHealth.upsert({
    where: { studentId },
    update: {
      overallScore: clampedScore,
      quizScore,
      assignmentScore,
      examScore,
      consistencyScore: clampedScore,
      weakSubjects,
      weakTopics: weakTopics as any,
      calculatedAt: new Date(),
    },
    create: {
      studentId,
      overallScore: clampedScore,
      quizScore,
      assignmentScore,
      examScore,
      consistencyScore: clampedScore,
      weakSubjects,
      weakTopics: weakTopics as any,
    },
  });

  return clampedScore;
}

export async function identifyWeakSubjects(studentId: string, threshold = 60): Promise<string[]> {
  const performances = await prisma.studentPerformance.findMany({
    where: { studentId },
  });

  const subjectStats: Record<string, { totalScore: number; totalMax: number }> = {};

  for (const perf of performances) {
    if (!subjectStats[perf.subject]) {
      subjectStats[perf.subject] = { totalScore: 0, totalMax: 0 };
    }
    subjectStats[perf.subject].totalScore += perf.score;
    subjectStats[perf.subject].totalMax += perf.maxScore;
  }

  return Object.entries(subjectStats)
    .filter(([_, stats]) => stats.totalMax > 0 && (stats.totalScore / stats.totalMax) * 100 < threshold)
    .map(([subject]) => subject);
}

export async function identifyWeakTopics(studentId: string, threshold = 50): Promise<TopicPerformance[]> {
  const performances = await prisma.studentPerformance.findMany({
    where: { studentId },
  });

  const topicStats: Record<string, { subject: string; totalScore: number; totalMax: number; count: number }> = {};

  for (const perf of performances) {
    const key = `${perf.subject}:${perf.topic}`;
    if (!topicStats[key]) {
      topicStats[key] = { subject: perf.subject, totalScore: 0, totalMax: 0, count: 0 };
    }
    topicStats[key].totalScore += perf.score;
    topicStats[key].totalMax += perf.maxScore;
    topicStats[key].count += 1;
  }

  const weakTopics: TopicPerformance[] = [];

  for (const [key, stats] of Object.entries(topicStats)) {
    const percentage = stats.totalMax > 0 ? (stats.totalScore / stats.totalMax) * 100 : 0;
    if (percentage < threshold) {
      const topic = key.split(':')[1];
      const notes = await prisma.lectureNote.findMany({
        where: { subject: stats.subject, topic },
        take: 3,
        select: { id: true },
      });

      weakTopics.push({
        topic,
        subject: stats.subject,
        averageScore: percentage,
        assessmentCount: stats.count,
        status: 'weak',
        recommendedNotes: notes.map(n => n.id),
      });
    }
  }

  return weakTopics;
}

export async function getPerformanceTrends(studentId: string): Promise<PerformanceTrend[]> {
  const performances = await prisma.studentPerformance.findMany({
    where: { studentId },
    orderBy: { assessmentDate: 'asc' },
  });

  return performances.map(p => ({
    date: p.assessmentDate,
    subject: p.subject,
    score: p.maxScore > 0 ? (p.score / p.maxScore) * 100 : 0,
    assessmentType: p.assessmentType,
  }));
}

export async function getStudyRecommendations(studentId: string): Promise<StudyRecommendation[]> {
  const weakTopics = await identifyWeakTopics(studentId);

  const recommendations: StudyRecommendation[] = [];

  for (const wt of weakTopics) {
    const notes = await prisma.lectureNote.findMany({
      where: { subject: wt.subject, topic: wt.topic },
      take: 3,
    });

    let priority: 'high' | 'medium' | 'low';
    if (wt.averageScore < 30) {
      priority = 'high';
    } else if (wt.averageScore < 50) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    recommendations.push({
      topic: wt.topic,
      subject: wt.subject,
      reason: `Your average score in ${wt.subject} - ${wt.topic} is ${wt.averageScore.toFixed(1)}%, which is below the recommended threshold.`,
      recommendedNotes: notes,
      priority,
    });
  }

  return recommendations;
}
