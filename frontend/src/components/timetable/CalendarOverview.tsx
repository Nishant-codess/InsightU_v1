import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    isSameDay, 
    isToday, 
    addMonths, 
    subMonths 
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';

interface CalendarOverviewProps {
    onDateSelect: (date: Date) => void;
    selectedDate: Date;
}

export default function CalendarOverview({ onDateSelect, selectedDate }: CalendarOverviewProps) {
    const { token } = useAuthStore();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarData, setCalendarData] = useState<Record<string, any>>({});
    const [, setLoading] = useState(false);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    useEffect(() => {
        const fetchMonthData = async () => {
            setLoading(true);
            try {
                // We'll fetch all dates for this month
                // For simplicity in this mock-heavy environment, we'll fetch them individually or use the holidays endpoint if available
                // But the best way is to have a bulk endpoint.
                // Since we only have /api/student/holidays, let's use that to mark holidays.
                const res = await axios.get('/api/student/holidays', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const holidayMap: Record<string, any> = {};
                res.data.holidays.forEach((h: any) => {
                    const d = format(new Date(h.date), 'yyyy-MM-dd');
                    holidayMap[d] = h;
                });
                setCalendarData(holidayMap);
            } catch (err) {
                console.error('Failed to fetch calendar overview:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMonthData();
    }, [currentMonth, token]);

    return (
        <div className="bg-surface/20 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
            {/* Calendar Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand/10 rounded-xl">
                        <CalendarIcon className="w-5 h-5 text-brand" />
                    </div>
                    <h3 className="text-xl font-black text-white tracking-tight uppercase leading-none">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors border border-white/5"
                    >
                        <ChevronLeftIcon className="w-5 h-5 text-textLight" />
                    </button>
                    <button 
                        onClick={() => setCurrentMonth(new Date())}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand hover:bg-brand/10 rounded-xl transition-colors"
                    >
                        Today
                    </button>
                    <button 
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors border border-white/5"
                    >
                        <ChevronRightIcon className="w-5 h-5 text-textLight" />
                    </button>
                </div>
            </div>

            {/* Days Grid/List Overview */}
            <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto no-scrollbar">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={currentMonth.toISOString()}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 gap-2"
                    >
                        {days.map((day) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const holiday = calendarData[dateKey];
                            const isSelected = isSameDay(day, selectedDate);
                            const isTodayDay = isToday(day);
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            const isActualHoliday = !!holiday;

                            return (
                                <button
                                    key={dateKey}
                                    onClick={() => onDateSelect(day)}
                                    className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                                        isSelected 
                                        ? 'bg-brand/10 border-brand shadow-glow shadow-brand/5' 
                                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border ${
                                            isSelected ? 'bg-brand text-background border-brand' : 'bg-surface border-white/5 group-hover:border-white/20'
                                        }`}>
                                            <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-background/60' : 'text-textLight/40'}`}>
                                                {format(day, 'eee')}
                                            </span>
                                            <span className="text-lg font-black leading-none">
                                                {format(day, 'dd')}
                                            </span>
                                        </div>
                                        
                                        <div className="text-left">
                                            <h4 className={`text-sm font-bold uppercase tracking-tight ${
                                                isActualHoliday || isWeekend ? 'text-green-400' : 'text-white'
                                            }`}>
                                                {isActualHoliday ? holiday.name : isWeekend ? (day.getDay() === 0 ? 'Sunday' : 'Saturday') : 'Regular Classes'}
                                            </h4>
                                            <p className="text-[10px] text-textLight font-medium opacity-60">
                                                {isTodayDay ? 'CURRENT DAY' : format(day, 'MMMM do')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {isActualHoliday || isWeekend ? (
                                            <div className="px-3 py-1 bg-green-500/10 rounded-lg border border-green-500/20">
                                                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Holiday</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-textLight font-black uppercase tracking-widest opacity-40">Day Order</span>
                                                <span className="text-lg font-black text-brand leading-none">DO -</span>
                                            </div>
                                        )}
                                        {isTodayDay && (
                                            <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>
            
            <div className="p-4 bg-white/[0.01] border-t border-white/5 text-center">
                <p className="text-[10px] text-textLight/40 font-bold uppercase tracking-[0.2em]">
                    University Academic Calendar • SRM 2026
                </p>
            </div>
        </div>
    );
}
