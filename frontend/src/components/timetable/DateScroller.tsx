import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, subDays, isSameDay, startOfToday } from 'date-fns';

interface DateScrollerProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
}

export default function DateScroller({ selectedDate, onDateChange }: DateScrollerProps) {
    const today = startOfToday();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Generate dates: 7 days ago and 21 days ahead
    const dates = Array.from({ length: 30 }, (_, i) => addDays(subDays(today, 7), i));

    useEffect(() => {
        if (scrollRef.current) {
            const selectedElement = scrollRef.current.querySelector('[data-selected="true"]');
            if (selectedElement) {
                selectedElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [selectedDate]);

    return (
        <div className="relative w-full overflow-hidden py-4">
            <div 
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto no-scrollbar px-6 pb-2"
            >
                {dates.map((date) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, today);
                    
                    return (
                        <motion.button
                            key={date.toISOString()}
                            data-selected={isSelected}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onDateChange(date)}
                            className={`flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-3xl transition-all duration-500 border relative ${
                                isSelected 
                                ? 'bg-brand text-background border-brand shadow-glow shadow-brand/20' 
                                : 'bg-surface/30 text-textLight border-white/5 hover:border-white/20'
                            }`}
                        >
                            {isToday && !isSelected && (
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-brand/10 rounded-full border border-brand/20">
                                    <span className="text-[8px] font-black text-brand uppercase tracking-widest">Today</span>
                                </div>
                            )}
                            
                            <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-background/60' : 'text-textLight/40'}`}>
                                {format(date, 'eee')}
                            </span>
                            <span className="text-2xl font-black leading-none uppercase">
                                {format(date, 'dd')}
                            </span>
                            <span className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-background/60' : 'text-textLight/40'}`}>
                                {format(date, 'MMM')}
                            </span>

                            {isSelected && (
                                <motion.div 
                                    layoutId="active-indicator"
                                    className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-background"
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
            
            {/* Visual Fades */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
    );
}
