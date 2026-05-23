import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { PlusIcon } from '@heroicons/react/24/outline';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

interface Holiday {
  id: string;
  title: string;
  date: string;
  description?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { user, token } = useAuthStore();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ title: '', date: '', description: '' });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isTeacher = user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN';
  const canManage = isTeacher || isAdmin;

  const fetchHolidays = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/holidays`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHolidays(await res.json());

      const calRes = await fetch(`${API}/calendar-days`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (calRes.ok) setCalendarDays(await calRes.json());
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
    }
  };

  useEffect(() => { fetchHolidays(); }, [token]);

  const handleAddHoliday = async () => {
    if (!newHoliday.title || !newHoliday.date) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/holidays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newHoliday),
      });
      if (!res.ok) throw new Error('Failed to add holiday');
      setIsModalOpen(false);
      setNewHoliday({ title: '', date: '', description: '' });
      fetchHolidays();
    } catch (err) {
      console.error('Failed to add holiday:', err);
    } finally {
      setLoading(false);
    }
  };



  // Calendar calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();


  const holidayDates = new Set(holidays.map(h => {
    const [yyyy, mm, dd] = h.date.split('T')[0].split('-');
    return `${parseInt(yyyy, 10)}-${parseInt(mm, 10) - 1}-${parseInt(dd, 10)}`;
  }));

  const isHoliday = (day: number) => holidayDates.has(`${year}-${month}-${day}`);

  // Create lookup for day orders and events from calendarDays
  const calendarDayLookup = new Map<string, any>();
  calendarDays.forEach(cd => {
     // cd.date is like "2026-08-04T00:00:00.000Z"
     // We extract YYYY, MM, DD manually to prevent browser timezone shifts!
     const [yyyy, mm, dd] = cd.date.split('T')[0].split('-');
     const y = parseInt(yyyy, 10);
     const m = parseInt(mm, 10) - 1; // 0-indexed month
     const d = parseInt(dd, 10);
     calendarDayLookup.set(`${y}-${m}-${d}`, cd);
  });

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;


  // Generate all days in the currently selected month
  const daysInSelectedMonth = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Auto-scroll to current day when viewing current month
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (today.getFullYear() === year && today.getMonth() === month) {
      // Small timeout to ensure rendering is complete
      timeoutId = setTimeout(() => {
        const todayCard = document.getElementById(`day-card-${today.getDate()}`);
        if (todayCard && scrollContainerRef.current) {
          todayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 100);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [year, month, calendarDays.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Academic Timeline</h1>
          <p className="text-gray-400 mt-1">Navigate through your academic schedule, day orders, and events.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all font-semibold shadow-lg shadow-purple-500/20"
          >
            <PlusIcon className="w-5 h-5" />
            Add Custom Event
          </button>
        )}
      </div>

      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-10 relative z-10 px-4">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl transition-all text-gray-400 hover:text-white hover:scale-105 active:scale-95 group"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div className="text-center flex flex-col items-center">
            <div className="inline-flex items-center justify-center space-x-3 bg-white/[0.03] border border-white/5 rounded-full px-6 py-2 mb-3">
               <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
               <span className="text-emerald-400/90 text-xs font-bold tracking-widest uppercase">Academic Timeline</span>
            </div>
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-500 tracking-tight drop-shadow-sm">
              {MONTHS[month]} {year}
            </h2>
          </div>

          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl transition-all text-gray-400 hover:text-white hover:scale-105 active:scale-95 group"
          >
            <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Sliding Calendar Container */}
        <div className="relative z-10 -mx-4 px-4 pb-4">
          <div ref={scrollContainerRef} className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent items-center h-[420px]">
            {daysInSelectedMonth.map((day) => {
              const dateObj = new Date(year, month, day);
              const dayName = DAYS[dateObj.getDay()];
              const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
              const holiday = isHoliday(day);
              const calDay = calendarDayLookup.get(`${year}-${month}-${day}`);
              const hasEventText = calDay?.name && calDay.name.length > 0;
              const hasDayOrder = !!calDay?.dayOrder;
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day}
                  id={`day-card-${day}`}
                  className={`
                    snap-center shrink-0 w-[300px] h-[360px] rounded-[2rem] flex flex-col p-8 transition-all duration-300 ease-out border relative overflow-hidden group hover:-translate-y-2
                    ${isCurrentDay 
                      ? 'bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-brand/20 border-purple-500/50 shadow-[0_0_40px_rgba(139,92,246,0.3)] ring-1 ring-purple-500/50 scale-[1.02]' 
                      : isWeekend && !hasEventText && !hasDayOrder && !holiday
                        ? 'bg-white/[0.01] border-white/5 opacity-50 scale-95'
                        : holiday
                          ? 'bg-gradient-to-br from-red-950/30 to-black/40 border-red-500/30 shadow-[0_8px_30px_rgba(239,68,68,0.1)]'
                          : hasEventText || hasDayOrder
                            ? 'bg-gradient-to-br from-emerald-950/20 to-black/40 border-emerald-500/20 shadow-[0_8px_30px_rgba(16,185,129,0.05)] hover:border-emerald-500/40'
                            : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                    }
                  `}
                >
                  {/* Subtle hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  {/* Top: Day & Date */}
                  <div className="flex justify-between items-start mb-auto relative z-10">
                    <div>
                      <div className={`font-bold uppercase tracking-[0.2em] text-xs mb-2 ${isCurrentDay ? 'text-purple-300' : 'text-gray-500'}`}>
                        {dayName}
                      </div>
                      <div className={`text-6xl font-black tracking-tighter ${isCurrentDay ? 'text-white' : holiday ? 'text-red-100' : hasDayOrder ? 'text-emerald-50' : 'text-gray-300'}`}>
                        {day}
                      </div>
                    </div>
                    
                    {/* Badges */}
                    <div className="flex flex-col gap-2 items-end">
                      {isCurrentDay && (
                        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(147,51,234,0.5)]">
                          Today
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Events / Holidays */}
                  <div className="space-y-4 relative z-10 w-full">
                    
                    {/* Day Order */}
                    {hasDayOrder && (
                       <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 backdrop-blur-md">
                         <div className="text-emerald-400/80 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">
                           Academic Schedule
                         </div>
                         <div className="text-emerald-300 font-black text-xl tracking-tight">
                           Day Order {calDay.dayOrder}
                         </div>
                       </div>
                    )}

                    {holiday && (
                      <div className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] animate-pulse" />
                          <span className="text-red-400/90 font-bold text-[10px] uppercase tracking-[0.2em]">Holiday</span>
                        </div>
                        <p className="text-red-100 text-sm font-semibold line-clamp-2 leading-relaxed">
                          {holidays.find(h => new Date(h.date).getDate() === day)?.title || "Scheduled Holiday"}
                        </p>
                      </div>
                    )}

                    {hasEventText && !holiday && (
                      <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span className="text-indigo-400/90 font-bold text-[10px] uppercase tracking-[0.2em]">Event</span>
                        </div>
                        <p className="text-gray-200 text-sm font-medium line-clamp-3 leading-relaxed">
                          {calDay.name}
                        </p>
                      </div>
                    )}

                    {!holiday && !hasEventText && !hasDayOrder && (
                      <div className="text-gray-500/50 font-medium text-sm text-center py-4 tracking-wide">
                        No scheduled events
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold text-white">Add New Holiday</h2>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Title *</label>
              <input
                type="text"
                className="w-full bg-white/10 border border-white/10 rounded-lg p-2.5 text-white focus:border-purple-500 outline-none"
                value={newHoliday.title}
                onChange={e => setNewHoliday({ ...newHoliday, title: e.target.value })}
                placeholder="e.g. Republic Day"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Date *</label>
              <input
                type="date"
                className="w-full bg-white/10 border border-white/10 rounded-lg p-2.5 text-white focus:border-purple-500 outline-none"
                value={newHoliday.date}
                onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Description (Optional)</label>
              <textarea
                className="w-full bg-white/10 border border-white/10 rounded-lg p-2.5 text-white focus:border-purple-500 outline-none"
                value={newHoliday.description}
                onChange={e => setNewHoliday({ ...newHoliday, description: e.target.value })}
                rows={3}
                placeholder="Brief description..."
              />
            </div>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddHoliday}
                disabled={loading || !newHoliday.title || !newHoliday.date}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
