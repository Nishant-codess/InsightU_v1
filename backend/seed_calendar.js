const fs = require('fs');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// A generic parser for the SRM academic planner pdfs dumped with `pdftotext -layout`
function parsePdf(txtPath, year, monthsStartIdx) {
  const text = fs.readFileSync(txtPath, 'utf-8');
  const lines = text.split('\n');
  
  // Find the header line to get column boundaries
  const headerIdx = lines.findIndex(l => l.includes('Dt') && l.includes('Day') && l.includes('DO'));
  if (headerIdx === -1) return [];
  const headerLine = lines[headerIdx];
  
  // Find indices of "Dt" to determine column starts
  const dtMatches = [...headerLine.matchAll(/\bDt\b/g)];
  if (dtMatches.length !== 6) return [];
  
  const colWidths = [];
  for (let i = 0; i < dtMatches.length; i++) {
    const start = dtMatches[i].index;
    const end = i === dtMatches.length - 1 ? headerLine.length : dtMatches[i+1].index;
    colWidths.push({ start, end });
  }

  // We'll collect data by month and date: calendar[monthIdx][date] = { eventLines: [], do: null }
  const calendar = Array.from({ length: 6 }, () => Array.from({ length: 32 }, () => ({ eventLines: [], do: null })));
  
  // Process lines around the table
  let currentDt = -1;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('NOTE') || line.includes('Application Development Centre')) break;
    
    // Check if this line is a main date line
    // Date lines usually start with a number in the first column
    const firstColText = line.substring(colWidths[0].start, colWidths[0].end).trim();
    let isMainDateLine = false;
    const match = firstColText.match(/^(\d+)\s+[A-Za-z]{3}/);
    if (match) {
      currentDt = parseInt(match[1]);
      isMainDateLine = true;
    }
    
    for (let c = 0; c < 6; c++) {
      const colText = line.substring(colWidths[c].start, colWidths[c].end || line.length);
      
      let dateMatch = colText.trim().match(/^(\d+)\s+[A-Za-z]{3}\s*(.*)$/);
      let cellEvent = '';
      let cellDO = null;

      if (dateMatch) {
         // It's a date line for this column
         const dt = parseInt(dateMatch[1]);
         const remainder = dateMatch[2].trim();
         
         // In remainder, the last token is usually DO and maybe '-'
         // Format: [Event text] [DO] [-]
         const parts = remainder.split(/\s+/);
         if (parts.length > 0) {
            // Check if last is '-'
            let last = parts[parts.length - 1];
            if (last === '-') parts.pop();
            
            // Now last is DO
            if (parts.length > 0) {
               let possibleDO = parts[parts.length - 1];
               if (['1','2','3','4','5','-'].includes(possibleDO)) {
                  cellDO = possibleDO === '-' ? null : parseInt(possibleDO);
                  parts.pop();
               } else {
                  // Sometimes DO is missing
               }
            }
            cellEvent = parts.join(' ').trim();
         }
         
         if (dt >= 1 && dt <= 31) {
             calendar[c][dt].do = cellDO;
             if (cellEvent && cellEvent !== '-') calendar[c][dt].eventLines.push(cellEvent);
         }
      } else {
         // It's an overflow event line for the current or adjacent dates
         // We'll append it to the currentDt if it's valid
         let txt = colText.trim();
         // remove trailing '-' if it exists
         if (txt.endsWith('-')) txt = txt.slice(0, -1).trim();
         if (txt && currentDt >= 1 && currentDt <= 31) {
            calendar[c][currentDt].eventLines.push(txt);
         }
      }
    }
  }

  // Flatten out and build DB objects
  const records = [];
  for (let c = 0; c < 6; c++) {
    const month = monthsStartIdx + c; // e.g. 0-based month (Jul=6)
    // Javascript dates: month is 0-indexed
    for (let d = 1; d <= 31; d++) {
       const cell = calendar[c][d];
       if (cell.do !== null || cell.eventLines.length > 0) {
          // Check if valid date
          const dateObj = new Date(Date.UTC(year, month, d));
          if (dateObj.getUTCMonth() === month) {
             let eventStr = cell.eventLines.join(' ').trim();
             records.push({
                date: dateObj,
                dayOrder: cell.do,
                name: eventStr || null,
                isActive: true,
                isCancelled: false,
                version: 1
             });
          }
       }
    }
  }
  
  return records;
}

async function main() {
  await prisma.calendarDay.deleteMany({});
  console.log("Cleared existing calendar records.");

  // ODD Semester: Jul 2026 (month 6) to Dec 2026
  execSync(`pdftotext -layout "/Users/nishant/Documents/GitHub/InsightU/frontend/public/Academic Planner 26-27 odd.pdf" odd.txt`);
  const oddRecords = parsePdf('odd.txt', 2026, 6);
  console.log(`Parsed ${oddRecords.length} records for ODD semester.`);

  // EVEN Semester: Jan 2026 (month 0) to Jun 2026
  execSync(`pdftotext -layout "/Users/nishant/Documents/GitHub/InsightU/frontend/public/Academic planner even 25-26.pdf" even.txt`);
  const evenRecords = parsePdf('even.txt', 2026, 0);
  console.log(`Parsed ${evenRecords.length} records for EVEN semester.`);
  
  const allRecords = [...evenRecords, ...oddRecords];
  
  let inserted = 0;
  for (const rec of allRecords) {
    try {
       await prisma.calendarDay.upsert({
          where: { date_version: { date: rec.date, version: 1 } },
          update: { dayOrder: rec.dayOrder, name: rec.name },
          create: rec
       });
       inserted++;
    } catch(e) {
       console.error("Failed to insert", rec.date, e.message);
    }
  }

  console.log(`Successfully seeded ${inserted} calendar days!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
