import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const TIME_SLOTS = [
  "08:00 - 08:50", "08:50 - 09:40", "09:45 - 10:35", "10:40 - 11:30", "11:35 - 12:25",
  "12:30 - 01:20", "01:25 - 02:15", "02:20 - 03:10", "03:10 - 04:00", "04:00 - 04:50",
  "04:50 - 05:30", "05:30 - 06:10"
];

const DO_HEADERS = ["DO1", "DO2", "DO3", "DO4", "DO5"];

// Hardcoded slot matrix to match typical SRM timetable based on the user's reference image
const SLOT_MATRIX = [
  { DO1: 'A', DO2: null, DO3: 'C', DO4: null, DO5: 'E' },
  { DO1: 'A', DO2: null, DO3: 'C', DO4: null, DO5: 'E' },
  { DO1: 'F', DO2: null, DO3: 'A', DO4: null, DO5: 'C' },
  { DO1: 'F', DO2: null, DO3: 'D', DO4: null, DO5: 'F' },
  { DO1: 'G', DO2: null, DO3: 'B', DO4: null, DO5: 'D' },
  { DO1: null, DO2: 'B', DO3: null, DO4: 'D', DO5: null },
  { DO1: null, DO2: 'B', DO3: null, DO4: 'D', DO5: 'B_PRACTICAL' },
  { DO1: null, DO2: 'G', DO3: null, DO4: 'B', DO5: 'B_PRACTICAL' },
  { DO1: null, DO2: 'G', DO3: null, DO4: 'E', DO5: null },
  { DO1: null, DO2: 'A', DO3: null, DO4: 'C', DO5: null },
  { DO1: null, DO2: null, DO3: null, DO4: null, DO5: 'H' },
  { DO1: null, DO2: null, DO3: null, DO4: null, DO5: 'H' }
];

export default function TimetablePage() {
  const { token, portalData } = useAuthStore();
  const [timetable, setTimetable] = useState<any[]>(portalData?.timetable || []);

  useEffect(() => {
    if (!timetable.length && token) {
      fetch(`${API}/portal/timetable`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTimetable(data.data || []);
        }
      })
      .catch(err => console.error("Failed to fetch timetable:", err));
    }
  }, [token, timetable.length]);

  // Create a quick lookup for courses by slot
  const courseLookup = new Map();
  timetable.forEach(course => {
    if (course.slot) {
      courseLookup.set(course.slot, course);
    }
  });

  // Fallback for slot H (Analytical and Logical Thinking) since it's not in the mock list
  courseLookup.set('H', { courseTitle: 'Analytical and Logical Thinking Skills', slot: 'H' });
  courseLookup.set('B_PRACTICAL', { ...courseLookup.get('B'), type: 'Practical' });

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Academic Timetable</h1>
        <p className="text-gray-400 mt-1">Day Order wise class schedule</p>
      </div>

      <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl relative overflow-x-auto">
        {/* Table Container */}
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-6 mb-4">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500" />
              </div>
            </div>
            {DO_HEADERS.map((doLabel) => (
              <div key={doLabel} className="text-center text-gray-400 font-bold tracking-widest text-sm">
                {doLabel}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          <div className="space-y-0.5">
            {TIME_SLOTS.map((time, rowIndex) => (
              <div key={time} className="grid grid-cols-6 min-h-[80px]">
                {/* Time Column */}
                <div className="flex flex-col items-center justify-center text-gray-500 text-xs font-semibold py-2">
                  <span>{time.split(' - ')[0]}</span>
                  <span className="my-1">-</span>
                  <span>{time.split(' - ')[1]}</span>
                </div>

                {/* Day Order Columns */}
                {DO_HEADERS.map((doLabel) => {
                  const slotKey = SLOT_MATRIX[rowIndex][doLabel as keyof typeof SLOT_MATRIX[0]];
                  const course = slotKey ? courseLookup.get(slotKey) : null;
                  
                  // Styling based on slot type to match the reference
                  let bgColor = "bg-transparent";
                  if (course) {
                    if (slotKey === 'B_PRACTICAL') {
                      bgColor = "bg-[#4B2875] border border-[#6B3CA6]"; // Purple for practicals
                    } else {
                      bgColor = "bg-[#094573] border border-[#0A5D9C]"; // Standard blue
                    }
                  }

                  return (
                    <div 
                      key={`${doLabel}-${rowIndex}`} 
                      className={`
                        flex flex-col items-center justify-center text-center p-2 border border-black/50
                        ${course ? bgColor : 'bg-black'} 
                        transition-all duration-300 hover:brightness-110
                      `}
                    >
                      {course ? (
                        <motion.span 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-white text-[11px] font-medium leading-snug px-2"
                        >
                          {course.courseTitle}
                        </motion.span>
                      ) : (
                        <span className="text-gray-800">-</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Footer label */}
        <div className="mt-8 text-center text-gray-500 text-xs font-semibold uppercase tracking-[0.2em]">
          Powered By | InsightU
        </div>
      </div>
    </div>
  );
}
