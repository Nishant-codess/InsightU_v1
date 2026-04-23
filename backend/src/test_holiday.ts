import prisma from './src/config/database';
import { getTodaySchedule } from './src/services/timetable/timetable';

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'nr0070@srmist.edu.in' }
    });
    const sched = await getTodaySchedule(user!.id);
    console.log(sched.status);
    console.log(sched.message);
}
main().finally(() => process.exit(0));
