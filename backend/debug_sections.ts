import prisma from './src/config/database';

async function main() {
    const students = await prisma.student.findMany({
        where: {
            OR: [
                { name: { contains: 'Nishant' } },
                { registrationNumber: 'RA2411003010008' }
            ]
        }
    });

    console.log('--- Student Records ---');
    students.forEach(s => {
        console.log(`Name: ${s.name}`);
        console.log(`Reg ID: ${s.registrationNumber}`);
        console.log(`Section: ${s.section}`);
        console.log(`Batch: ${s.batch}`);
        console.log(`Year: ${s.year}`);
        console.log('----------------------');
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
