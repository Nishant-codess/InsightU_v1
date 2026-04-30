import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('Seeding test teachers and parents...');
  console.log('⚠️  NOTE: Students are NOT created via seed. They are auto-created from SRM portal scraper.');
  console.log('Students should only exist for classroom/whiteboard membership, not for login.\n');

  // 1. Create Test Teachers
  const teachers = [
    {
      name: 'Dr. Rajesh Kumar',
      email: 'rajesh.kumar@srmist.edu.in',
      password: 'Teacher@123!',
      department: 'C.Tech',
      subjects: ['Data Structures', 'Algorithms'],
    },
    {
      name: 'Prof. Priya Sharma',
      email: 'priya.sharma@srmist.edu.in',
      password: 'Teacher@456!',
      department: 'DSB',
      subjects: ['Database Systems', 'SQL'],
    },
    {
      name: 'Dr. Amit Patel',
      email: 'amit.patel@srmist.edu.in',
      password: 'Teacher@789!',
      department: 'NW',
      subjects: ['Networking', 'TCP/IP'],
    },
  ];

  for (const teacher of teachers) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: teacher.email },
      });

      if (existingUser) {
        console.log(`✓ Teacher already exists: ${teacher.email}`);
        continue;
      }

      const passwordHash = await bcrypt.hash(teacher.password, SALT_ROUNDS);

      await prisma.user.create({
        data: {
          email: teacher.email,
          passwordHash,
          role: 'TEACHER',
          teacher: {
            create: {
              name: teacher.name,
              department: teacher.department,
              subjects: teacher.subjects,
              approvalStatus: 'APPROVED', // Auto-approve for testing
              approvedAt: new Date(),
            },
          },
        },
      });

      console.log(`✓ Created teacher: ${teacher.email}`);
    } catch (error) {
      console.error(`✗ Failed to create teacher ${teacher.email}:`, error);
    }
  }

  // 2. Create Test Parents
  const parents = [
    {
      name: 'Mr. Vikram Singh',
      email: 'vikram.singh@email.com',
      password: 'Parent@123!',
      phone: '+91 98765 43210',
      childSrmEmail: 'nr0070@srmist.edu.in',
      childSrmPassword: 'Chandana@AIR18',
    },
    {
      name: 'Mrs. Anjali Gupta',
      email: 'anjali.gupta@email.com',
      password: 'Parent@456!',
      phone: '+91 87654 32109',
      childSrmEmail: 'yc4162@srmist.edu.in',
      childSrmPassword: 'Student@123',
    },
    {
      name: 'Mr. Suresh Reddy',
      email: 'suresh.reddy@email.com',
      password: 'Parent@789!',
      phone: '+91 76543 21098',
      childSrmEmail: 'dp1844@srmist.edu.in',
      childSrmPassword: 'Student@123',
    },
  ];

  for (const parent of parents) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: parent.email },
      });

      if (existingUser) {
        console.log(`✓ Parent already exists: ${parent.email}`);
        continue;
      }

      const passwordHash = await bcrypt.hash(parent.password, SALT_ROUNDS);

      await prisma.user.create({
        data: {
          email: parent.email,
          passwordHash,
          role: 'PARENT',
          parent: {
            create: {
              name: parent.name,
              phone: parent.phone,
              childSrmEmail: parent.childSrmEmail,
              childSrmPassword: parent.childSrmPassword,
              approvalStatus: 'APPROVED', // Auto-approve for testing
              approvedAt: new Date(),
            },
          },
        },
      });

      console.log(`✓ Created parent: ${parent.email}`);
    } catch (error) {
      console.error(`✗ Failed to create parent ${parent.email}:`, error);
    }
  }

  console.log('\n✅ Test users seeded successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('\nTeachers:');
  teachers.forEach(t => {
    console.log(`  ${t.email} / ${t.password}`);
  });
  console.log('\nParents:');
  parents.forEach(p => {
    console.log(`  ${p.email} / ${p.password}`);
  });
}

main()
  .catch((e) => {
    console.error('Error seeding test users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
