import prisma from './config/database';
import { getScheduleByDate } from './services/timetable/timetable';

async function main() {
    console.log("Starting debug script...");
    const user = await prisma.user.findUnique({
        where: { email: 'nr0070@srmist.edu.in' }
    });
    if (!user) {
        console.log("No user found");
        return;
    }
    
    try {
        console.log(`Getting schedule for user id: ${user.id}`);
        const schedule = await getScheduleByDate(user.id);
        console.log("SUCCESS:", JSON.stringify(schedule, null, 2));
    } catch (e: any) {
        console.log("ERROR executing getTodaySchedule:");
        console.error(e.message);
        console.error(e.stack);
    }
}

main().finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
});
