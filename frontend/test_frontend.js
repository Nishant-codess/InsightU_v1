const fs = require('fs');
const content = fs.readFileSync('src/pages/calendar/CalendarPage.tsx', 'utf8');
console.log("CalendarPage exists, size:", content.length);
