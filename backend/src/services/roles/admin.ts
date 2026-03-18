import prisma from '../../config/database';
import { UserRole } from '@prisma/client';

export async function getAllUsers(adminId: string, roleFilter?: UserRole) {
   // Ensure invoker is admin
   const admin = await prisma.admin.findUnique({ where: { id: adminId } });
   if (!admin) throw new Error('Unauthorized');

   // Requirement 14.2 
   const whereCondition = roleFilter ? { role: roleFilter } : {};
   return prisma.user.findMany({
       where: whereCondition,
       select: {
           id: true,
           email: true,
           role: true,
           createdAt: true,
       }
   });
}

export async function modifyUserRole(adminId: string, targetUserId: string, newRole: UserRole) {
   const admin = await prisma.admin.findUnique({ where: { id: adminId } });
   if (!admin) throw new Error('Unauthorized');
   if (admin.userId === targetUserId) throw new Error('Admins cannot change their own role');

   // Requirement 14.4
   return prisma.user.update({
       where: { id: targetUserId },
       data: { role: newRole }
   });
}

export async function getPlatformAnalytics(adminId: string) {
   const admin = await prisma.admin.findUnique({ where: { id: adminId } });
   if (!admin) throw new Error('Unauthorized');

   // Requirement 14.3
   const totalUsers = await prisma.user.count();
   const totalStudents = await prisma.student.count();
   const totalTeachers = await prisma.teacher.count();
   
   const activeQuizSessions = await prisma.quizSession.count({ where: { status: 'ACTIVE' }});
   const totalNotesUploaded = await prisma.lectureNote.count();
   
   return {
       metrics: {
           users: totalUsers,
           students: totalStudents,
           teachers: totalTeachers,
       },
       engagement: {
           liveQuizzes: activeQuizSessions,
           systemNotes: totalNotesUploaded
       }
   };
}
