import prisma from '../../config/database';

export interface AssignmentMetadata {
  teacherId: string;
  subject: string;
  topic: string;
  title: string;
  description: string;
  dueDate: Date;
  maxMarks: number;
}

export async function uploadAssignment(metadata: AssignmentMetadata, file?: Express.Multer.File) {
  if (!metadata.subject || !metadata.topic || !metadata.dueDate || !metadata.title || !metadata.maxMarks) {
    throw new Error('Missing required metadata for assignment');
  }

  // Simulate storing file and getting URL (e.g. from S3) if one exists
  const fileUrl = file ? `https://storage.insightu.dev/assignments/${Date.now()}_${file.originalname}` : null;

  const assignment = await prisma.assignment.create({
    data: {
      teacherId: metadata.teacherId,
      subject: metadata.subject,
      topic: metadata.topic,
      title: metadata.title,
      description: metadata.description,
      fileUrl,
      dueDate: metadata.dueDate,
      maxMarks: metadata.maxMarks,
    },
  });

  // Notify students (inter-logic dependency for Req 16.3 and 15.3)
  // Real implementation would pull all applicable users for the course
  await prisma.notification.createMany({
    data: [
      {
        userId: 'student-1', // Mocking student distribution mapping
        type: 'ASSIGNMENT_POSTED',
        title: 'New Assignment Posted',
        message: `${metadata.title} is due on ${metadata.dueDate.toDateString()}`,
        actionUrl: `/assignments/${assignment.id}`,
      }
    ]
  });

  return assignment;
}

export interface AssignmentMarkInput {
  studentId: string;
  score: number;
}

export async function uploadAssignmentMarks(assignmentId: string, marks: AssignmentMarkInput[]) {
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new Error('Assignment not found');

  // Validate all marks first before creating any performance entries
  for (const mark of marks) {
    if (mark.score > assignment.maxMarks || mark.score < 0) {
      throw new Error(`Score ${mark.score} for student ${mark.studentId} is out of bounds (Max: ${assignment.maxMarks})`);
    }
  }

  const performanceEntries = marks.map((mark) => {
    return {
      studentId: mark.studentId,
      subject: assignment.subject,
      topic: assignment.topic,
      assessmentType: 'ASSIGNMENT',
      score: mark.score,
      maxScore: assignment.maxMarks,
      percentage: (mark.score / assignment.maxMarks) * 100,
      assessmentDate: new Date(),
    };
  });

  // Insert performance analytics updates mappings for 16.4 and 16.5
  return prisma.studentPerformance.createMany({
    data: performanceEntries,
  });
}
