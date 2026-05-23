const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const days = await prisma.calendarDay.findMany();
  
  let fixed = 0;
  for (const d of days) {
     let name = d.name || '';
     let dayOrder = d.dayOrder;
     
     // Match pattern " [DO] - [Next Dt]" at the end of the name
     // e.g. " 1 - 8" or " - - 10" or " 3 - 12"
     const match = name.match(/\s+([1-5]|-)\s*-\s*(\d+)$/);
     if (match) {
        let possibleDO = match[1];
        if (possibleDO !== '-') {
           dayOrder = parseInt(possibleDO);
        } else {
           dayOrder = null;
        }
        // Remove the matched suffix from name
        name = name.slice(0, match.index).trim();
     } else {
        // Look for trailing " - -" without the next Dt
        const match2 = name.match(/\s+-\s*-$/);
        if (match2) {
           name = name.slice(0, match2.index).trim();
           // if dayOrder is not already set, it means no DO
        }
     }
     
     // Also clean trailing hyphens
     if (name.endsWith('-')) name = name.slice(0, -1).trim();
     
     if (name !== d.name || dayOrder !== d.dayOrder) {
         await prisma.calendarDay.update({
             where: { id: d.id },
             data: { name: name || null, dayOrder }
         });
         fixed++;
     }
  }
  console.log(`Fixed ${fixed} records.`);
}

main().finally(() => prisma.$disconnect());
