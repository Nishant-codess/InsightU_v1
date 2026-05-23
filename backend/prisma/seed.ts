import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Must match the encryption key in aiProvider.ts
const ENCRYPTION_KEY = Buffer.from('insightu-ai-key-secret-32-bytes!!', 'utf8').slice(0, 32);

function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

async function main() {
  console.log('Starting deterministic seed...');

  // 1. Clean existing data (Safe order)
  await prisma.personalSlot.deleteMany();
  await prisma.unifiedSlot.deleteMany();
  await prisma.calendarDay.deleteMany();
  
  await prisma.refreshToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.aIProviderConfig.deleteMany();
  await prisma.classroomMember.deleteMany();
  await prisma.classroomPost.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.whiteboardMember.deleteMany();
  await prisma.whiteboard.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.sectionTimetable.deleteMany();

  console.log('Cleaned all existing data');

  // 2. Create User-Specific Admin (The one requested)
  await prisma.user.create({
    data: {
      email: 'admin@srmist.edu.in',
      passwordHash: await hashPassword('admin123'),
      role: UserRole.ADMIN,
      admin: {
        create: {
          name: 'SRM Admin',
        },
      },
    },
  });
  console.log('Created primary admin: admin@srmist.edu.in');

  // 3. Create User-Specific Student (The one requested)
  const nishantUser = await prisma.user.create({
    data: {
      email: 'nr0070@srmist.edu.in',
      passwordHash: await hashPassword('Nishant@1'),
      role: UserRole.STUDENT,
      student: {
        create: {
          name: 'Nishant Ranjan',
          registrationNumber: 'RA2411003010008',
          course: 'B.Tech',
          department: 'CTECH',
          branch: 'CSE',
          year: 2,
          section: 'A1',
          batch: 'Batch 1',
          group: 'G1',
          collegeMailId: 'nr0070@srmist.edu.in',
        },
      },
    },
  });
  console.log('Created primary student: nr0070@srmist.edu.in');

  // 3a. Seed Nishant's OpenAI API key (set via env or manually after seeding)
  // API key intentionally not hardcoded — set OPENAI_API_KEY in .env and configure via Profile page
  console.log('Skipping OpenAI API key seed — configure via Profile & AI page after login');

  // 3b. Seed Nishant's PersonalSlots from his official My Time Table AY 2025-26 EVEN
  const nishantStudent = await prisma.student.findUnique({ where: { userId: nishantUser.id } });
  if (nishantStudent) {
    await prisma.personalSlot.createMany({
      data: [
        { studentId: nishantStudent.id, slots: ['A'],        normalizedKey: 'A',       subject: 'Probability and Queueing Theory',    room: 'TP 102', type: 'theory' },
        { studentId: nishantStudent.id, slots: ['B'],        normalizedKey: 'B',       subject: 'Design and Analysis of Algorithms',  room: 'TP 102', type: 'theory' },
        { studentId: nishantStudent.id, slots: ['C'],        normalizedKey: 'C',       subject: 'Internet of Things',                 room: 'TP 301', type: 'theory' },
        { studentId: nishantStudent.id, slots: ['D'],        normalizedKey: 'D',       subject: 'Database Management Systems',        room: 'TP 102', type: 'theory' },
        { studentId: nishantStudent.id, slots: ['E'],        normalizedKey: 'E',       subject: 'Social Engineering',                 room: 'TP 102', type: 'theory' },
        { studentId: nishantStudent.id, slots: ['F'],        normalizedKey: 'F',       subject: 'Artificial Intelligence',            room: 'TP 102', type: 'theory' },
        { studentId: nishantStudent.id, slots: ['G'],        normalizedKey: 'G',       subject: 'Design Thinking and Methodology',    room: 'TP 102', type: 'theory' },
        { studentId: nishantStudent.id, slots: ['P47','P48'], normalizedKey: 'P47,P48', subject: 'Design and Analysis of Algorithms Lab', room: 'TP008', type: 'lab' },
        { studentId: nishantStudent.id, slots: ['L51','L52'], normalizedKey: 'L51,L52', subject: 'Analytical and Logical Thinking Skills',  room: 'NA',    type: 'theory' },
      ],
    });
    console.log('Seeded PersonalSlots for Nishant Ranjan (9 slots)');
  }

  // 4. Create A1 Section Teachers (from Nishant's timetable)
  const teacherData = [
    { name: 'Dr. R. Varadharajan', email: 'varadharajan@srmist.edu.in', subjects: ['Probability and Queueing Theory', 'Analytical and Logical Thinking Skills'], empId: '101485' },
    { name: 'Dr. Anto Arockia Rosaline R', email: 'rosaline@srmist.edu.in', subjects: ['Design and Analysis of Algorithms'], empId: '102921' },
    { name: 'Shanmathi S', email: 'shanmathi@srmist.edu.in', subjects: ['Internet of Things'], empId: '103810' },
    { name: 'Dr. R. Subash', email: 'subash@srmist.edu.in', subjects: ['Database Management Systems'], empId: '101616' },
    { name: 'Dr. R. Sathya', email: 'sathya@srmist.edu.in', subjects: ['Social Engineering', 'Analytical and Logical Thinking Skills'], empId: '103696' },
    { name: 'Dr. P. Madhavan', email: 'madhavan@srmist.edu.in', subjects: ['Artificial Intelligence'], empId: '102469' },
    { name: 'Dr. S. Padmini', email: 'padmini@srmist.edu.in', subjects: ['Design Thinking and Methodology'], empId: '100290' },
  ];

  for (const t of teacherData) {
    await prisma.user.create({
      data: {
        email: t.email,
        passwordHash: await hashPassword('Teacher@123'),
        role: UserRole.TEACHER,
        teacher: {
          create: {
            name: t.name,
            department: 'Computer Science and Engineering',
            subjects: t.subjects,
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
          },
        },
      },
    });
    console.log(`Created teacher: ${t.email}`);
  }

  // 5. Create A1 Section Students
  const studentData = [
    { regNo: 'RA2411003010001', name: 'Yashvardhan Chaudhri',           srmEmail: 'yc4162@srmist.edu.in', batch: 'Batch 1' },
    { regNo: 'RA2411003010002', name: 'P Dakshata',                      srmEmail: 'dp1844@srmist.edu.in', batch: 'Batch 1' },
    { regNo: 'RA2411003010003', name: 'Aditi Krishna',                   srmEmail: 'ak7493@srmist.edu.in', batch: 'Batch 1' },
    { regNo: 'RA2411003010004', name: 'Ganta Venkata Sai Prakash Reddy', srmEmail: 'vg4861@srmist.edu.in', batch: 'Batch 1' },
    { regNo: 'RA2411003010005', name: 'Hardik Sahni',                    srmEmail: 'hs6315@srmist.edu.in', batch: 'Batch 1' },
    { regNo: 'RA2411003010006', name: 'Vishesh Jhabak',                  srmEmail: 'vj8711@srmist.edu.in', batch: 'Batch 1' },
    { regNo: 'RA2411003010007', name: 'Aditya Mishra',                   srmEmail: 'am0516@srmist.edu.in', batch: 'Batch 1' },
    // RA2411003010008 = Nishant Ranjan (already created above)
    { regNo: 'RA2411003010009', name: 'J Aakash',                        srmEmail: 'ja0735@srmist.edu.in', batch: 'Batch 1' },
    { regNo: 'RA2411003010010', name: 'G Vishal',                        srmEmail: 'vg7506@srmist.edu.in', batch: 'Batch 1' },
    { regNo: 'RA2411003010011', name: 'Gopika Manoj',                    srmEmail: 'gm6102@srmist.edu.in', batch: 'Batch 1' },
    { regNo: 'RA2411003010012', name: 'Vaishnavi',                       srmEmail: 'va7267@srmist.edu.in', batch: 'Batch 1' },
    { regNo: 'RA2411003010013', name: 'Madivada Asish',                  srmEmail: 'ma3650@srmist.edu.in', batch: 'Batch 2' },
    { regNo: 'RA2411003010014', name: 'Lavansh Choubey',                 srmEmail: 'lc1061@srmist.edu.in', batch: 'Batch 2' },
    { regNo: 'RA2411003010015', name: 'Ishu Gurtu',                      srmEmail: 'ig0224@srmist.edu.in', batch: 'Batch 2' },
    { regNo: 'RA2411003010016', name: 'Sharu Nethra R',                  srmEmail: 'sn1477@srmist.edu.in', batch: 'Batch 2' },
    { regNo: 'RA2411003010017', name: 'Adarsh Gupta',                    srmEmail: 'ag8114@srmist.edu.in', batch: 'Batch 2' },
    { regNo: 'RA2411003010018', name: 'Nidhi Nayana',                    srmEmail: 'nn1591@srmist.edu.in', batch: 'Batch 2' },
    { regNo: 'RA2411003010019', name: 'Parth Gupta',                     srmEmail: 'pg5206@srmist.edu.in', batch: 'Batch 2' },
    { regNo: 'RA2411003010020', name: 'G Anirudh',                       srmEmail: 'ag1681@srmist.edu.in', batch: 'Batch 2' },
    { regNo: 'RA2411003010021', name: 'Lakshmi Narayana Kumar B',        srmEmail: 'lk5673@srmist.edu.in', batch: 'Batch 2' },
    { regNo: 'RA2411003010022', name: 'Kanishk Sharma',                  srmEmail: 'ks9566@srmist.edu.in', batch: 'Batch 2' },
    { regNo: 'RA2411003010023', name: 'Mohammad Nadeem',                 srmEmail: 'mn4220@srmist.edu.in', batch: 'Batch 2' },
    { regNo: 'RA2411003010024', name: 'Rushil Yadav',                    srmEmail: 'ry3655@srmist.edu.in', batch: 'Batch 2' },
  ];

  const createdStudentUserIds: Record<string, string> = {}; // regNo -> userId

  for (const s of studentData) {
    const u = await prisma.user.create({
      data: {
        email: s.srmEmail,
        passwordHash: await hashPassword('Student@123'),
        role: UserRole.STUDENT,
        student: {
          create: {
            name: s.name,
            registrationNumber: s.regNo,
            course: 'B.Tech',
            department: 'CTECH',
            branch: 'CSE',
            year: 2,
            section: 'A1',
            batch: s.batch,
            group: s.batch === 'Batch 1' ? 'G1' : 'G2',
            collegeMailId: s.srmEmail,
          },
        },
      },
    });
    createdStudentUserIds[s.regNo] = u.id;
    console.log(`Created student: ${s.srmEmail} (${s.name})`);
  }

  // 7. Seed Academic Calendar (2025-26 EVEN Semester) from official SRM Academic Planner
  console.log('\nSeeding Academic Calendar...');
  const calendarEntries: { date: Date; dayOrder: number | null; name: string | null }[] = [
    // January 2026
    { date: new Date('2026-01-01'), dayOrder: null, name: 'New Year\'s Day' },
    { date: new Date('2026-01-08'), dayOrder: 1,    name: null },
    { date: new Date('2026-01-09'), dayOrder: 2,    name: null },
    { date: new Date('2026-01-12'), dayOrder: 3,    name: null },
    { date: new Date('2026-01-13'), dayOrder: 4,    name: null },
    { date: new Date('2026-01-14'), dayOrder: 5,    name: null },
    { date: new Date('2026-01-15'), dayOrder: null, name: 'Pongal' },
    { date: new Date('2026-01-16'), dayOrder: null, name: 'Thiruvalluvar Day' },
    { date: new Date('2026-01-17'), dayOrder: null, name: 'Uzhavar Thirunal' },
    { date: new Date('2026-01-19'), dayOrder: 1,    name: null },
    { date: new Date('2026-01-20'), dayOrder: 2,    name: null },
    { date: new Date('2026-01-21'), dayOrder: 3,    name: null },
    { date: new Date('2026-01-22'), dayOrder: 4,    name: null },
    { date: new Date('2026-01-23'), dayOrder: 5,    name: null },
    { date: new Date('2026-01-26'), dayOrder: null, name: 'Republic Day' },
    { date: new Date('2026-01-27'), dayOrder: 1,    name: null },
    { date: new Date('2026-01-28'), dayOrder: 2,    name: null },
    { date: new Date('2026-01-29'), dayOrder: 3,    name: null },
    { date: new Date('2026-01-30'), dayOrder: 4,    name: null },
    // February 2026
    { date: new Date('2026-02-02'), dayOrder: null, name: 'Thaipoosam' },
    { date: new Date('2026-02-03'), dayOrder: 5,    name: null },
    { date: new Date('2026-02-04'), dayOrder: 1,    name: null },
    { date: new Date('2026-02-05'), dayOrder: 2,    name: null },
    { date: new Date('2026-02-06'), dayOrder: 3,    name: null },
    { date: new Date('2026-02-09'), dayOrder: 4,    name: null },
    { date: new Date('2026-02-10'), dayOrder: 5,    name: null },
    { date: new Date('2026-02-11'), dayOrder: 1,    name: null },
    { date: new Date('2026-02-12'), dayOrder: 2,    name: null },
    { date: new Date('2026-02-13'), dayOrder: 3,    name: null },
    { date: new Date('2026-02-16'), dayOrder: 4,    name: null },
    { date: new Date('2026-02-17'), dayOrder: 5,    name: null },
    { date: new Date('2026-02-18'), dayOrder: 1,    name: null },
    { date: new Date('2026-02-19'), dayOrder: 2,    name: null },
    { date: new Date('2026-02-20'), dayOrder: 3,    name: null },
    { date: new Date('2026-02-23'), dayOrder: 4,    name: null },
    { date: new Date('2026-02-24'), dayOrder: 5,    name: null },
    { date: new Date('2026-02-25'), dayOrder: 1,    name: null },
    { date: new Date('2026-02-26'), dayOrder: 2,    name: null },
    { date: new Date('2026-02-27'), dayOrder: 3,    name: null },
    // March 2026
    { date: new Date('2026-03-02'), dayOrder: 4,    name: null },
    { date: new Date('2026-03-03'), dayOrder: 5,    name: null },
    { date: new Date('2026-03-04'), dayOrder: null, name: 'Holi' },
    { date: new Date('2026-03-05'), dayOrder: 1,    name: null },
    { date: new Date('2026-03-06'), dayOrder: 2,    name: null },
    { date: new Date('2026-03-09'), dayOrder: 3,    name: null },
    { date: new Date('2026-03-10'), dayOrder: 4,    name: null },
    { date: new Date('2026-03-11'), dayOrder: 5,    name: null },
    { date: new Date('2026-03-12'), dayOrder: 1,    name: null },
    { date: new Date('2026-03-13'), dayOrder: 2,    name: null },
    { date: new Date('2026-03-16'), dayOrder: 3,    name: null },
    { date: new Date('2026-03-17'), dayOrder: 4,    name: null },
    { date: new Date('2026-03-18'), dayOrder: 5,    name: null },
    { date: new Date('2026-03-19'), dayOrder: null, name: 'Telugu New Year\'s Day' },
    { date: new Date('2026-03-20'), dayOrder: 1,    name: null },
    { date: new Date('2026-03-21'), dayOrder: null, name: 'Ramzan' },
    { date: new Date('2026-03-23'), dayOrder: 2,    name: null },
    { date: new Date('2026-03-24'), dayOrder: 3,    name: null },
    { date: new Date('2026-03-25'), dayOrder: 4,    name: null },
    { date: new Date('2026-03-26'), dayOrder: 5,    name: null },
    { date: new Date('2026-03-27'), dayOrder: 1,    name: null },
    { date: new Date('2026-03-30'), dayOrder: 2,    name: null },
    { date: new Date('2026-03-31'), dayOrder: null, name: 'Mahaveer Jayanthi' },
    // April 2026
    { date: new Date('2026-04-01'), dayOrder: 3,    name: null },
    { date: new Date('2026-04-02'), dayOrder: 4,    name: null },
    { date: new Date('2026-04-03'), dayOrder: null, name: 'Good Friday' },
    { date: new Date('2026-04-06'), dayOrder: 1,    name: null },
    { date: new Date('2026-04-07'), dayOrder: 2,    name: null },
    { date: new Date('2026-04-08'), dayOrder: 3,    name: null },
    { date: new Date('2026-04-09'), dayOrder: 4,    name: null },
    { date: new Date('2026-04-10'), dayOrder: 5,    name: null },
    { date: new Date('2026-04-13'), dayOrder: 1,    name: null },
    { date: new Date('2026-04-14'), dayOrder: null, name: "Tamil New Year's Day / Dr. B.R. Ambedkar's Birthday" },
    { date: new Date('2026-04-15'), dayOrder: 2,    name: null },
    { date: new Date('2026-04-16'), dayOrder: 3,    name: null },
    { date: new Date('2026-04-17'), dayOrder: 4,    name: null },
    { date: new Date('2026-04-20'), dayOrder: 5,    name: null },
    { date: new Date('2026-04-21'), dayOrder: 1,    name: null },
    { date: new Date('2026-04-22'), dayOrder: 2,    name: null },
    { date: new Date('2026-04-23'), dayOrder: null, name: 'General Election - Holiday' },
    { date: new Date('2026-04-24'), dayOrder: 3,    name: null },
    { date: new Date('2026-04-27'), dayOrder: 4,    name: null },
    { date: new Date('2026-04-28'), dayOrder: 5,    name: null },
    { date: new Date('2026-04-29'), dayOrder: 1,    name: null },
    { date: new Date('2026-04-30'), dayOrder: 2,    name: null },
    // May 2026
    { date: new Date('2026-05-01'), dayOrder: null, name: 'May Day' },
    { date: new Date('2026-05-04'), dayOrder: 3,    name: null },
    { date: new Date('2026-05-05'), dayOrder: 4,    name: null },
    { date: new Date('2026-05-06'), dayOrder: 5,    name: null }, // Last working day
    { date: new Date('2026-05-28'), dayOrder: null, name: 'Bakrid' },
    // June 2026
    { date: new Date('2026-06-26'), dayOrder: null, name: 'Muharram' },
  ];

  await prisma.calendarDay.createMany({
    data: calendarEntries.map(e => ({
      date: e.date,
      dayOrder: e.dayOrder,
      name: e.name,
      version: 1,
      isActive: true,
    })),
  });
  console.log(`Seeded ${calendarEntries.length} calendar entries`);

  // 8. Seed Unified Timetable for Batch 1 (from official SRM Unified Time Table 2025-Batch 1)
  console.log('\nSeeding Unified Timetable for Batch 1...');
  const timings = [
    { startTime: 480,  endTime: 530  }, // P1:  08:00 - 08:50
    { startTime: 530,  endTime: 580  }, // P2:  08:50 - 09:40
    { startTime: 585,  endTime: 635  }, // P3:  09:45 - 10:35
    { startTime: 640,  endTime: 690  }, // P4:  10:40 - 11:30
    { startTime: 695,  endTime: 745  }, // P5:  11:35 - 12:25
    { startTime: 750,  endTime: 800  }, // P6:  12:30 - 01:20
    { startTime: 805,  endTime: 855  }, // P7:  01:25 - 02:15
    { startTime: 860,  endTime: 910  }, // P8:  02:20 - 03:10
    { startTime: 910,  endTime: 960  }, // P9:  03:10 - 04:00
    { startTime: 960,  endTime: 1010 }, // P10: 04:00 - 04:50
    { startTime: 1010, endTime: 1050 }, // P11: 04:50 - 05:30
    { startTime: 1050, endTime: 1090 }, // P12: 05:30 - 06:10
  ];

  // Exact grid from official Unified Time Table 2025-Batch 1 PDF
  const batch1Grid: Record<number, string[][]> = {
    1: [['A'], ['A','X'], ['F','X'], ['F'], ['G'], ['P6'], ['P7'], ['P8'], ['P9'], ['P10'], ['L11'], ['L12']],
    2: [['P11'], ['P12','X'], ['P13','X'], ['P14'], ['P15'], ['B'], ['B'], ['G'], ['G'], ['A'], ['L21'], ['L22']],
    3: [['C'], ['C','X'], ['A','X'], ['D'], ['B'], ['P26'], ['P27'], ['P28'], ['P29'], ['P30'], ['L31'], ['L32']],
    4: [['P31'], ['P32','X'], ['P33','X'], ['P34'], ['P35'], ['D'], ['D'], ['B'], ['E'], ['C'], ['L41'], ['L42']],
    5: [['E'], ['E','X'], ['C','X'], ['F'], ['D'], ['P46'], ['P47'], ['P48'], ['P49'], ['P50'], ['L51'], ['L52']],
  };

  const unifiedEntries: any[] = [];
  for (const [dayOrder, periods] of Object.entries(batch1Grid)) {
    periods.forEach((slots, idx) => {
      unifiedEntries.push({
        batch: 'Batch 1',
        dayOrder: parseInt(dayOrder),
        period: idx + 1,
        slots,
        startTime: timings[idx].startTime,
        endTime: timings[idx].endTime,
        version: 1,
        isActive: true,
      });
    });
  }

  await prisma.unifiedSlot.createMany({ data: unifiedEntries });
  console.log(`Seeded ${unifiedEntries.length} unified slots for Batch 1`);

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 LOGIN CREDENTIALS SUMMARY:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ADMIN:');
  console.log('  admin@srmist.edu.in                    / admin123');
  console.log('\nSTUDENTS (password: Student@123 for all except Nishant):');
  console.log('  nr0070@srmist.edu.in                   / Nishant@1     (Nishant Ranjan)');
  studentData.forEach(s => console.log(`  ${s.srmEmail.padEnd(40)} / Student@123  (${s.name})`));
  console.log('\nTEACHERS (password: Teacher@123):');
  teacherData.forEach(t => console.log(`  ${t.email.padEnd(40)} / Teacher@123  (${t.name})`));
  console.log('═══════════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
