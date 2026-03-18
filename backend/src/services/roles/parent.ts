import prisma from '../../config/database';
import { getStudentDashboard } from '../analytics/performance';

export async function linkStudentToParent(parentId: string, studentRegistrationNumber: string) {
  const parent = await prisma.parent.findUnique({ where: { id: parentId } });
  if (!parent) throw new Error('Parent not found');

  const student = await prisma.student.findUnique({ 
      where: { registrationNumber: studentRegistrationNumber } 
  });
  
  if (!student) throw new Error('Student not found with that registration number');

  // Requirement 11.1
  return prisma.parentStudent.create({
    data: {
      parentId: parent.id,
      studentId: student.id,
    }
  });
}

export async function getLinkedStudents(parentId: string) {
  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    include: { student: true }
  });
  // Requirement 11.2 mapping mechanism
  return links.map(link => link.student);
}

export async function getStudentDashboardForParent(parentId: string, studentId: string) {
   // Validate the implicit link (Requirement 11.4 Security Map)
   const link = await prisma.parentStudent.findUnique({
       where: { parentId_studentId: { parentId, studentId } }
   });

   if (!link) {
       throw new Error('Unauthorized: Student is not linked to this parent account');
   }

   // Requirement 11.3: Parent sees perfectly mapped student analytics but strictly in Read-Only layer (enforced by Controller scopes lacking mutation endpoints)
   return getStudentDashboard(studentId);
}
