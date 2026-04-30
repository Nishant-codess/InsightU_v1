import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  CalendarIcon, 
  AcademicCapIcon, 
  ExclamationCircleIcon, 
  ArrowDownTrayIcon,
  ChevronRightIcon,
  SparklesIcon,
  QueueListIcon,
  Squares2X2Icon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import { format, startOfToday } from 'date-fns';
import { useAuthStore } from '../../store/useAuthStore';
import HolidayPlanner from '../../components/timetable/HolidayPlanner';
import DateScroller from '../../components/timetable/DateScroller';
import CalendarOverview from '../../components/timetable/CalendarOverview';
import PortalSyncModal from '../../components/timetable/PortalSyncModal';

function parseClassDetails(rawSubject: string) {
    if (!rawSubject || rawSubject === 'No Class') return { name: 'No Class', teacher: '' };
    if (rawSubject === 'Course Title') return { name: 'Theory Engine', teacher: 'TBD' };
    
    // Check if it's purely a teacher string: "Rosaline R (102921"
    if (rawSubject.match(/^[A-Z][a-z]+ [A-Z] \(\d+$/)) {
        return { name: 'Elective Theory', teacher: rawSubject.split(' (')[0] };
    }
    
    // Default subject string: "Subject Name Teacher Name (ID"
    const parts = rawSubject.split(' (');
    if (parts.length > 1) {
        let fullStr = parts[0].trim();
        const words = fullStr.split(' ');
        if (words.length > 3) {
             const subjectName = words.slice(0, -2).join(' ');
             const teacherName = words.slice(-2).join(' ');
             return { name: subjectName, teacher: teacherName };
        }
        return { name: fullStr, teacher: '' };
    }
    return { name: rawSubject, teacher: '' };
}

export default function TimetableDetail() {
  const { user, token } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'daily' | 'calendar'>('daily');
  const [hasPersonalSlots, setHasPersonalSlots] = useState<boolean | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchSchedule = async (date: Date) => {
    setLoading(true);
    try {
        const dateStr = format(date, 'yyyy-MM-dd');
        const res = await axios.get(`/api/student/schedule?date=${dateStr}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data?.status === 'ERROR') {
            setScheduleError(res.data.message);
            setScheduleData(null);
        } else {
            setScheduleData(res.data);
            setScheduleError(null);
            // Show import banner only if student has never entered their timetable
            const slots = res.data?.schedule ?? [];
            const hasClasses = slots.some((s: any) => s.status === 'CLASS');
            const isHolidayDay = res.data?.status === 'HOLIDAY';
            setHasPersonalSlots(hasClasses || isHolidayDay || res.data?.status === 'SUCCESS');
        }
    } catch (err: any) {
        console.error('Failed to fetch schedule:', err);
        setScheduleError(err.response?.data?.message || 'Fatal Timeline Error');
    } finally {
        setLoading(false);
    }
  };

  // Check if student has any personal slots at all (for import banner)
  useEffect(() => {
    const checkSlots = async () => {
      try {
        const res = await axios.get('/api/student/timetable/has-slots', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHasPersonalSlots(res.data?.hasSlots ?? false);
      } catch {
        setHasPersonalSlots(false);
      }
    };
    checkSlots();
  }, [token]);

  useEffect(() => {
    fetchSchedule(selectedDate);
  }, [selectedDate, token]);

  const isHoliday = scheduleData?.status === 'HOLIDAY';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Portal Import Modal */}
      {showImportModal && (
        <PortalSyncModal
          mode="timetable"
          token={token ?? ''}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            setHasPersonalSlots(true);
            fetchSchedule(selectedDate);
          }}
        />
      )}
      
      {/* Dynamic Navigation & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
              <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand/10 rounded-xl border border-brand/20">
                      <CalendarIcon className="w-6 h-6 text-brand" />
                  </div>
                  <h1 className="text-3xl font-black text-white tracking-tight uppercase leading-none">Timetable</h1>
              </div>
              <p className="text-[10px] text-textLight/60 font-black tracking-[0.2em] uppercase pl-1">
                Batch {user?.student?.batch?.toUpperCase()} • {format(selectedDate, 'EEEE, MMM do')}
              </p>
          </div>

          <div className="flex items-center gap-3">
              <div className="flex bg-surface/40 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                 <button 
                  onClick={() => setViewMode('daily')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${viewMode === 'daily' ? 'bg-brand text-background font-black' : 'text-textLight hover:text-white'}`}
                 >
                    <QueueListIcon className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest">Today</span>
                 </button>
                 <button 
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${viewMode === 'calendar' ? 'bg-brand text-background font-black' : 'text-textLight hover:text-white'}`}
                 >
                    <Squares2X2Icon className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest">All</span>
                 </button>
              </div>

              <button className="flex items-center gap-2 px-5 py-3 bg-brand/10 text-brand rounded-2xl border border-brand/20 hover:bg-brand/20 transition-all font-black shadow-glow shadow-brand/5">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest">Download</span>
              </button>
          </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'daily' ? (          <motion.div 
            key="daily"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* ── Import Timetable Banner (shown when no personal slots exist) ── */}
            {hasPersonalSlots === false && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-brand/5 border border-brand/20 rounded-3xl"
              >
                <div className="space-y-1">
                  <p className="text-sm font-black text-white uppercase tracking-tight">
                    No timetable entered yet
                  </p>
                  <p className="text-xs text-textLight leading-relaxed">
                    Enter your subjects and slots from your SRM Academia timetable page — saved permanently to your account.
                  </p>
                </div>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-brand text-background rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/20 hover:brightness-110 transition-all shrink-0"
                >
                  <CloudArrowUpIcon className="w-4 h-4" />
                  Enter My Timetable
                </button>
              </motion.div>
            )}

            {/* Horizontal Date Scroller */}
            <DateScroller 
              selectedDate={selectedDate} 
              onDateChange={(date) => setSelectedDate(date)} 
            />

            {/* Timeline View */}
            <div className="max-w-4xl mx-auto w-full">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-brand font-black animate-pulse uppercase tracking-[0.2em] text-[10px]">Syncing Engine...</p>
                  </div>
                ) : scheduleError ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-12 rounded-3xl text-center space-y-4 shadow-2xl shadow-red-500/5">
                        <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto opacity-80" />
                        <div>
                            <h3 className="text-xl font-black text-red-500 uppercase tracking-tighter mb-1 font-inter">Engine Disconnected</h3>
                            <p className="text-sm font-bold text-red-400/60 font-inter">{scheduleError}</p>
                        </div>
                    </div>
                ) : isHoliday ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-16 text-center border-brand/20 bg-brand/5 relative overflow-hidden group">
                        <SparklesIcon className="absolute -right-10 -top-10 w-60 h-60 text-brand/5 group-hover:rotate-12 transition-transform duration-1000" />
                        <div className="p-6 bg-brand/10 w-fit rounded-full mx-auto mb-8 shadow-glow shadow-brand/10 ring-1 ring-brand/20">
                            <AcademicCapIcon className="w-14 h-14 text-brand" />
                        </div>
                        <h2 className="text-4xl font-black text-white mb-3 uppercase tracking-tighter font-inter">{scheduleData.message}</h2>
                        <p className="text-textLight font-medium max-w-md mx-auto text-sm opacity-80 leading-relaxed font-inter">The University Academic Calendar reports no instructional activity for {format(selectedDate, 'PPPP')}.</p>
                        
                        <div className="mt-10 flex flex-wrap justify-center gap-4">
                            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Type: </span>
                                <span className="text-[10px] font-black text-brand uppercase tracking-widest">Public Event</span>
                            </div>
                            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">DO: </span>
                                <span className="text-[10px] font-black text-brand uppercase tracking-widest">null</span>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Timeline Summary</h2>
                                <div className="px-2 py-0.5 bg-brand/10 rounded-full border border-brand/20">
                                    <span className="text-[8px] font-black text-brand uppercase tracking-widest">DO {scheduleData?.dayOrder}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
                                <span className="text-[9px] text-brand font-black uppercase tracking-widest">Active Stream</span>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <AnimatePresence mode="popLayout">
                                {scheduleData?.schedule?.map((period: any, idx: number) => {
                                    const { name, teacher } = parseClassDetails(period.subject);
                                    return (
                                        <motion.div 
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className={`group relative p-6 rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${
                                                period.isOngoing 
                                                ? 'bg-brand/10 border-brand shadow-glow shadow-brand/10 ring-1 ring-brand/30' 
                                                : 'bg-surface/20 border-white/5 hover:border-white/20 hover:bg-surface/40'
                                            }`}
                                        >
                                            {period.isOngoing && (
                                                <div className="absolute left-6 top-8 bottom-8 w-1.5 bg-brand rounded-full shadow-glow shadow-brand" />
                                            )}
                                            
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-4 md:pl-8">
                                                <div className="flex-1 space-y-4">
                                                    {/* Time & Status Row */}
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/60 rounded-xl border border-white/5">
                                                            <ClockIcon className="w-3.5 h-3.5 text-brand" />
                                                            <span className="text-[11px] font-black text-white tracking-widest">{period.time}</span>
                                                        </div>
                                                        {period.status === 'CLASS' && (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/5 rounded-xl border border-brand/10">
                                                                <span className="text-[9px] font-black text-brand uppercase tracking-widest">{period.type}</span>
                                                            </div>
                                                        )}
                                                        {period.isOngoing && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand rounded-xl shadow-lg shadow-brand/20"
                                                            >
                                                                <div className="w-1.5 h-1.5 rounded-full bg-background animate-pulse" />
                                                                <span className="text-[9px] font-black text-background uppercase tracking-widest">ON AIR</span>
                                                            </motion.div>
                                                        )}
                                                    </div>

                                                    {/* Subject Details */}
                                                    <div>
                                                        <h3 className={`text-2xl font-black tracking-tight uppercase leading-tight ${period.status === 'FREE' ? 'text-white/10' : 'text-white'}`}>
                                                            {name}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-4 mt-2">
                                                            {period.status === 'CLASS' && (
                                                                <>
                                                                    <div className="flex items-center gap-1.5 text-textLight/60">
                                                                        <MapPinIcon className="w-3.5 h-3.5" />
                                                                        <span className="text-[10px] font-bold uppercase tracking-widest group-hover:text-brand transition-colors">{period.room}</span>
                                                                    </div>
                                                                    {teacher && (
                                                                        <div className="flex items-center gap-1.5 text-textLight/60">
                                                                            <UserIcon className="w-3.5 h-3.5" />
                                                                            <span className="text-[10px] font-bold uppercase tracking-widest">{teacher}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {period.isNext && !period.isOngoing && (
                                                        <div className="px-5 py-2.5 border border-brand/30 rounded-2xl bg-brand/5">
                                                            <span className="text-[10px] font-black text-brand uppercase tracking-[0.2em]">Up Next</span>
                                                        </div>
                                                    )}
                                                    {!period.isOngoing && !period.isNext && period.status !== 'FREE' && (
                                                        <div className="p-3 bg-white/5 rounded-2xl opacity-20 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                                                            <ChevronRightIcon className="w-5 h-5 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="calendar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <CalendarOverview 
              selectedDate={selectedDate} 
              onDateSelect={(date) => {
                setSelectedDate(date);
                setViewMode('daily');
              }} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Holiday Planner (Keep for user functionality) */}
      <div className="mt-12 pt-12 border-t border-white/5">
        <HolidayPlanner schedule={scheduleData?.schedule} />
      </div>
    </div>
  );
}
