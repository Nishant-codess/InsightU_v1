import prisma from '../../config/database';

export async function listUsers() {
    return prisma.user.findMany({
        include: {
            student: true,
            teacher: true,
            admin: true
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function updateUser(userId: string, data: any) {
    const { email, role, profile } = data;

    // Update base user
    await prisma.user.update({
        where: { id: userId },
        data: { email, role }
    });

    // Update specific profile if provided
    if (role === 'STUDENT' && profile) {
        await prisma.student.update({
            where: { userId },
            data: {
                name: profile.name,
                year: profile.year,
                section: profile.section,
                batch: profile.batch,
                department: profile.department
            }
        });
    } else if (role === 'TEACHER' && profile) {
        await prisma.teacher.update({
            where: { userId },
            data: {
                name: profile.name,
                department: profile.department
            }
        });
    }

    return { success: true };
}

export async function deleteUser(userId: string) {
    // Delete User record - Cascade delete in Prisma schema will handle Student/Teacher/Parent/Admin profiles
    return prisma.user.delete({
        where: { id: userId }
    });
}
