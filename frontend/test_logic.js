const calendarDays = [
  {
    "id": "043dbad7-f0bf-4fb0-9b7a-8cab55f44d20",
    "date": "2026-08-12T00:00:00.000Z",
    "dayOrder": 2,
    "name": null
  }
];

const calendarDayLookup = new Map();
calendarDays.forEach(cd => {
   const [yyyy, mm, dd] = cd.date.split('T')[0].split('-');
   const y = parseInt(yyyy, 10);
   const m = parseInt(mm, 10) - 1; // 0-indexed month
   const d = parseInt(dd, 10);
   calendarDayLookup.set(`${y}-${m}-${d}`, cd);
});

console.log(calendarDayLookup.get(`2026-7-12`));
