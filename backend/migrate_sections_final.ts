import prisma from './src/config/database';

async function main() {
    const students = await prisma.student.findMany();
    
    console.log(`Checking ${students.length} students...`);
    
    for (const s of students) {
        const batchNum = s.batch.includes('1') ? '1' : '2';
        const expectedSection = `${s.section[0]}${batchNum}`;
        
        if (s.section !== expectedSection) {
            console.log(`Updating ${s.name}: ${s.section} -> ${expectedSection}`);
            await prisma.student.update({
                where: { id: s.id },
                data: { section: expectedSection }
            });
        }
    }
    
    console.log('Migration complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
