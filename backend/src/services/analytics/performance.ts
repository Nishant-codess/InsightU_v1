import prisma from '../../config/database';

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
    // Subject Aggregation
    if (!subjectMarks[perf.subject]) {
      subjectMarks[perf.subject] = { earned: 0, max: 0 };
    }
    subjectMarks[perf.subject].earned += perf.score;
    subjectMarks[perf.subject].max += perf.maxScore;

    // Topic Aggregation (Req 10.1 & 10.3)
    const topicKey = `${perf.subject}:${perf.topic}`;
    if (!topicStats[topicKey]) {
      topicStats[topicKey] = { subject: perf.subject, earned: 0, max: 0 };
    }
    topicStats[topicKey].earned += perf.score;
    topicStats[topicKey].max += perf.maxScore;

    totalEarned += perf.score;
    totalMax += perf.maxScore;
  });

  // Calculate Academic Health Score (Req 4.3 & 20.1)
  const academicHealthScore = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

  const weakSubjects = Object.entries(subjectMarks)
    .filter(([_, stats]) => (stats.earned / stats.max) * 100 < 60)
    .map(([subject]) => subject); // Threshold < 60%

  const weakTopics = Object.entries(topicStats)
    .filter(([_, stats]) => (stats.earned / stats.max) * 100 < 50)
    .map(([topicKey, stats]) => ({
       topic: topicKey.split(':')[1],
       subject: stats.subject,
    })); // Threshold < 50%

  // Check if we need to dispatch performance distribution alerts (Req 15.4)
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

  // Study Recommendations generator (Req 4.6 & 10.3)
  const recommendations = weakTopics.map(wt => `Review Lecture Notes for ${wt.subject}: ${wt.topic}`);

  return {
    academicHealthScore,
    weakSubjects, // Req 4.4
    weakTopics,   // Req 4.5
    recommendations, 
    subjectMarks, // Req 4.1
    trends: performances // Req 4.2
  };
}
