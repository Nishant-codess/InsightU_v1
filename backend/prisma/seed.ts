import { PrismaClient, UserRole } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Simple hash function for development (in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Starting seed...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.notificationPreferences.deleteMany();
  await prisma.academicHealth.deleteMany();
  await prisma.studentPerformance.deleteMany();
  await prisma.studentExamMarks.deleteMany();
  await prisma.quizParticipation.deleteMany();
  await prisma.quizSession.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.noteAnnotation.deleteMany();
  await prisma.noteBookmark.deleteMany();
  await prisma.lectureNote.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.academicCalendar.deleteMany();

  console.log('Cleaned existing data');

  // Create Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@insightu.edu',
      passwordHash: hashPassword('admin123'),
      role: UserRole.ADMIN,
      admin: {
        create: {
          name: 'System Admin',
        },
      },
    },
  });
  console.log('Created admin user');

  // Create Teachers
  const teacher1User = await prisma.user.create({
    data: {
      email: 'john.doe@insightu.edu',
      passwordHash: hashPassword('teacher123'),
      role: UserRole.TEACHER,
      teacher: {
        create: {
          name: 'Dr. John Doe',
          department: 'Computer Science',
          subjects: ['Data Structures', 'Algorithms', 'Database Systems'],
        },
      },
    },
  });

  const teacher2User = await prisma.user.create({
    data: {
      email: 'jane.smith@insightu.edu',
      passwordHash: hashPassword('teacher123'),
      role: UserRole.TEACHER,
      teacher: {
        create: {
          name: 'Dr. Jane Smith',
          department: 'Computer Science',
          subjects: ['Operating Systems', 'Computer Networks', 'Web Development'],
        },
      },
    },
  });
  console.log('Created teachers');

  // Create Students
  const students = [];
  const sections = ['A', 'B', 'C'];
  const batches = ['Batch 1', 'Batch 2'];
  const courses = ['BTech', 'BE'];
  const branches = ['CSE', 'ECE', 'ME'];
  const departments = ['CTech', 'Electronics', 'Mechanical'];
  
  for (let i = 0; i < 10; i++) {
    const section = sections[i % sections.length];
    const batch = batches[i % batches.length];
    const course = courses[i % courses.length];
    const branch = branches[i % branches.length];
    const department = departments[i % departments.length];
    const regNum = `RA241100301000${i}`;
    
    const studentUser = await prisma.user.create({
      data: {
        email: `student${i}@insightu.edu`,
        passwordHash: hashPassword('student123'),
        role: UserRole.STUDENT,
        student: {
          create: {
            name: `Student ${i + 1}`,
            registrationNumber: regNum,
            course: course,
            department: department,
            branch: branch,
            year: 2,
            section: section,
            batch: batch,
            group: `${section}${i % 2 + 1}`,
            collegeMailId: `student${i}@college.insightu.edu`,
          },
        },
      },
    });
    students.push(studentUser);
  }
  console.log('Created students');

  // Create Parents
  const parent1User = await prisma.user.create({
    data: {
      email: 'parent1@example.com',
      passwordHash: hashPassword('parent123'),
      role: UserRole.PARENT,
      parent: {
        create: {
          name: 'Parent One',
        },
      },
    },
  });

  const parent2User = await prisma.user.create({
    data: {
      email: 'parent2@example.com',
      passwordHash: hashPassword('parent123'),
      role: UserRole.PARENT,
      parent: {
        create: {
          name: 'Parent Two',
        },
      },
    },
  });
  console.log('Created parents');

  // Link parents to students
  const student1 = await prisma.student.findFirst({
    where: { userId: students[0].id },
  });
  const student2 = await prisma.student.findFirst({
    where: { userId: students[1].id },
  });
  const parent1 = await prisma.parent.findFirst({
    where: { userId: parent1User.id },
  });
  const parent2 = await prisma.parent.findFirst({
    where: { userId: parent2User.id },
  });

  if (student1 && parent1) {
    await prisma.parentStudent.create({
      data: {
        parentId: parent1.id,
        studentId: student1.id,
      },
    });
  }

  if (student2 && parent2) {
    await prisma.parentStudent.create({
      data: {
        parentId: parent2.id,
        studentId: student2.id,
      },
    });
  }
  console.log('Linked parents to students');

  // Create Lecture Notes
  const teacher1 = await prisma.teacher.findFirst({
    where: { userId: teacher1User.id },
  });

  if (teacher1) {
    await prisma.lectureNote.createMany({
      data: [
        {
          teacherId: teacher1.id,
          subject: 'Data Structures',
          topic: 'Arrays',
          title: 'Introduction to Arrays',
          description: 'Basic concepts of arrays and their operations',
          fileUrl: '/uploads/notes/arrays-intro.pdf',
          fileType: 'pdf',
          lectureDate: new Date('2024-01-15'),
        },
        {
          teacherId: teacher1.id,
          subject: 'Data Structures',
          topic: 'Linked Lists',
          title: 'Linked Lists Fundamentals',
          description: 'Understanding linked lists and their types',
          fileUrl: '/uploads/notes/linked-lists.pdf',
          fileType: 'pdf',
          lectureDate: new Date('2024-01-20'),
        },
        {
          teacherId: teacher1.id,
          subject: 'Algorithms',
          topic: 'Sorting',
          title: 'Sorting Algorithms',
          description: 'Overview of common sorting algorithms',
          fileUrl: '/uploads/notes/sorting.pdf',
          fileType: 'pdf',
          lectureDate: new Date('2024-01-25'),
        },
      ],
    });
  }
  console.log('Created lecture notes');

  // Create Quizzes
  if (teacher1) {
    const quiz = await prisma.quiz.create({
      data: {
        teacherId: teacher1.id,
        title: 'Data Structures Quiz 1',
        subject: 'Data Structures',
        timePerQuestion: 30,
        questions: [
          {
            id: 'q1',
            text: 'What is the time complexity of accessing an element in an array?',
            options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
            correctAnswer: 0,
            topic: 'Arrays',
            points: 10,
          },
          {
            id: 'q2',
            text: 'Which data structure uses LIFO principle?',
            options: ['Queue', 'Stack', 'Array', 'Tree'],
            correctAnswer: 1,
            topic: 'Stacks',
            points: 10,
          },
        ],
      },
    });
    console.log('Created quiz');
  }

  // Create Assignments
  const teacher2 = await prisma.teacher.findFirst({
    where: { userId: teacher2User.id },
  });

  if (teacher2) {
    await prisma.assignment.createMany({
      data: [
        {
          teacherId: teacher2.id,
          subject: 'Operating Systems',
          topic: 'Process Management',
          title: 'Process Scheduling Assignment',
          description: 'Implement various process scheduling algorithms',
          fileUrl: '/uploads/assignments/process-scheduling.pdf',
          dueDate: new Date('2024-02-15'),
          maxMarks: 100,
        },
        {
          teacherId: teacher2.id,
          subject: 'Computer Networks',
          topic: 'TCP/IP',
          title: 'Network Protocol Analysis',
          description: 'Analyze TCP/IP packet structure',
          fileUrl: '/uploads/assignments/tcp-ip-analysis.pdf',
          dueDate: new Date('2024-02-20'),
          maxMarks: 100,
        },
      ],
    });
  }
  console.log('Created assignments');

  // Create Exam
  if (teacher1) {
    const exam = await prisma.exam.create({
      data: {
        teacherId: teacher1.id,
        subject: 'Data Structures',
        examName: 'Mid-Term Exam',
        examDate: new Date('2024-02-01'),
        totalMarks: 100,
        questions: [
          { questionNumber: 1, topic: 'Arrays', maxMarks: 20 },
          { questionNumber: 2, topic: 'Linked Lists', maxMarks: 20 },
          { questionNumber: 3, topic: 'Stacks', maxMarks: 20 },
          { questionNumber: 4, topic: 'Queues', maxMarks: 20 },
          { questionNumber: 5, topic: 'Trees', maxMarks: 20 },
        ],
      },
    });

    // Create exam marks for some students
    const allStudents = await prisma.student.findMany({ take: 5 });
    for (const student of allStudents) {
      const questionMarks = [15, 18, 16, 17, 19];
      const total = questionMarks.reduce((a, b) => a + b, 0);
      
      await prisma.studentExamMarks.create({
        data: {
          examId: exam.id,
          studentId: student.id,
          questionMarks: questionMarks,
          totalMarks: total,
          percentage: (total / 100) * 100,
          topicScores: [
            { topic: 'Arrays', scored: 15, maxMarks: 20, percentage: 75 },
            { topic: 'Linked Lists', scored: 18, maxMarks: 20, percentage: 90 },
            { topic: 'Stacks', scored: 16, maxMarks: 20, percentage: 80 },
            { topic: 'Queues', scored: 17, maxMarks: 20, percentage: 85 },
            { topic: 'Trees', scored: 19, maxMarks: 20, percentage: 95 },
          ],
        },
      });
    }
  }
  console.log('Created exam and marks');

  // Create Student Performance data
  const allStudents = await prisma.student.findMany({ take: 3 });
  for (const student of allStudents) {
    await prisma.studentPerformance.createMany({
      data: [
        {
          studentId: student.id,
          subject: 'Data Structures',
          topic: 'Arrays',
          assessmentType: 'quiz',
          score: 8,
          maxScore: 10,
          percentage: 80,
          assessmentDate: new Date('2024-01-18'),
        },
        {
          studentId: student.id,
          subject: 'Data Structures',
          topic: 'Linked Lists',
          assessmentType: 'exam',
          score: 18,
          maxScore: 20,
          percentage: 90,
          assessmentDate: new Date('2024-02-01'),
        },
      ],
    });
  }
  console.log('Created student performance data');

  // Create Academic Health for students
  for (const student of allStudents) {
    await prisma.academicHealth.create({
      data: {
        studentId: student.id,
        overallScore: 82.5,
        quizScore: 80,
        assignmentScore: 85,
        examScore: 85,
        consistencyScore: 80,
        weakSubjects: ['Operating Systems'],
        weakTopics: [
          {
            topic: 'Process Management',
            subject: 'Operating Systems',
            averageScore: 65,
            recommendedNotes: [],
          },
        ],
      },
    });
  }
  console.log('Created academic health data');

  // Create Timetable for Year 2
  await prisma.timetable.createMany({
    data: [
      {
        year: 2,
        batch: 'Batch 1',
        fileUrl: '/uploads/timetables/year2-batch1.pdf',
        schedule: [
          {
            dayOrder: 1,
            periods: [
              {
                periodNumber: 1,
                startTime: '09:00',
                endTime: '10:00',
                subject: 'Data Structures',
                teacher: 'Dr. John Doe',
                room: 'CS-101',
              },
              {
                periodNumber: 2,
                startTime: '10:00',
                endTime: '11:00',
                subject: 'Algorithms',
                teacher: 'Dr. John Doe',
                room: 'CS-101',
              },
            ],
          },
        ],
      },
      {
        year: 2,
        batch: 'Batch 2',
        fileUrl: '/uploads/timetables/year2-batch2.pdf',
        schedule: [
          {
            dayOrder: 1,
            periods: [
              {
                periodNumber: 1,
                startTime: '09:00',
                endTime: '10:00',
                subject: 'Operating Systems',
                teacher: 'Dr. Jane Smith',
                room: 'CS-102',
              },
              {
                periodNumber: 2,
                startTime: '10:00',
                endTime: '11:00',
                subject: 'Computer Networks',
                teacher: 'Dr. Jane Smith',
                room: 'CS-102',
              },
            ],
          },
        ],
      },
    ],
  });
  console.log('Created timetables');

  // Create Academic Calendar
  await prisma.academicCalendar.create({
    data: {
      academicYear: '2023-2024',
      fileUrl: '/uploads/calendar/academic-calendar.pdf',
      dayOrderMapping: [
        { date: new Date('2024-01-15'), dayOrder: 1, isHoliday: false },
        { date: new Date('2024-01-16'), dayOrder: 2, isHoliday: false },
        { date: new Date('2024-01-17'), dayOrder: 3, isHoliday: false },
        { date: new Date('2024-01-18'), dayOrder: 4, isHoliday: false },
        { date: new Date('2024-01-19'), dayOrder: 5, isHoliday: false },
        { date: new Date('2024-01-20'), dayOrder: 0, isHoliday: true, holidayName: 'Weekend' },
      ],
    },
  });
  console.log('Created academic calendar');

  // Create Notifications
  for (const student of allStudents) {
    await prisma.notification.createMany({
      data: [
        {
          userId: student.userId,
          type: 'NEW_LECTURE_NOTE',
          title: 'New Lecture Note Available',
          message: 'Dr. John Doe uploaded notes for Data Structures - Arrays',
          actionUrl: '/notes',
          read: false,
        },
        {
          userId: student.userId,
          type: 'QUIZ_SCHEDULED',
          title: 'Quiz Scheduled',
          message: 'Data Structures Quiz 1 scheduled for tomorrow',
          actionUrl: '/quizzes',
          read: false,
        },
      ],
    });
  }
  console.log('Created notifications');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
