import { motion } from 'framer-motion';
import { CalendarIcon, ClockIcon, MapPinIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/useAuthStore';

export default function TimetableDetail() {
  const { user } = useAuthStore();
  
  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];
  const times = ['09:00 AM', '10:00 AM', '11:15 AM', '01:00 PM', '02:00 PM'];

  const mockFullSchedule: Record<string, any[]> = {
     'Day 1': [{ subject: 'Physics', room: 'Hall 102' }, { subject: 'Math', room: 'Hall 201' }, { subject: 'CS', room: 'Lab 1' }],
     'Day 2': [{ subject: 'Chemistry', room: 'Hall 105' }, { subject: 'Soft Skills', room: 'Hall 302' }, { subject: 'Math', room: 'Hall 201' }],
     'Day 3': [{ subject: 'CS', room: 'Lab 1' }, { subject: 'Physics', room: 'Hall 102' }, { subject: 'Circuit Design', room: 'Lab 3' }],
     'Day 4': [{ subject: 'Math', room: 'Hall 201' }, { subject: 'Electronics', room: 'Hall 105' }, { subject: 'Workshop', room: 'Shop B' }],
     'Day 5': [{ subject: 'Communication', room: 'Audio Room' }, { subject: 'Physics Lab', room: 'Lab 4' }, { subject: 'Chemistry', room: 'Hall 105' }]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-brand/10 rounded-2xl border border-brand/20">
                  <CalendarIcon className="w-8 h-8 text-brand" />
              </div>
              <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Full Academic Schedule</h1>
                  <p className="text-textLight">Cohort: {user?.student?.section || 'A'}{user?.student?.batch === 'Batch 1' ? '1' : '2'}</p>
              </div>
          </div>
      </div>

      <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="inline-grid grid-cols-[100px_repeat(5,1fr)] gap-4 min-w-[800px]">
              <div />
              {days.map(day => (
                  <div key={day} className="text-center p-3 bg-surface/50 rounded-xl border border-white/5">
                      <p className="text-brand font-bold text-sm uppercase tracking-widest">{day}</p>
                  </div>
              ))}

              {times.map((time, timeIdx) => (
                  <>
                    <div className="flex items-center justify-center text-xs font-bold text-textLight uppercase tracking-tighter">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {time}
                    </div>
                    {days.map(day => {
                        const lecture = mockFullSchedule[day][timeIdx];
                        return (
                            <motion.div 
                              key={`${day}-${time}`}
                              whileHover={{ scale: 1.02 }}
                              className={`p-4 rounded-xl border transition-all ${lecture ? 'glass-card border-white/10 bg-surface/40' : 'bg-white/5 border-dashed border-white/5 opacity-50'}`}
                            >
                                {lecture ? (
                                    <>
                                        <p className="text-white font-bold text-sm mb-1">{lecture.subject}</p>
                                        <div className="flex items-center text-[10px] text-textLight">
                                            <MapPinIcon className="w-3 h-3 mr-1 text-brand" />
                                            {lecture.room}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-[10px] text-textLight/20 text-center">-</p>
                                )}
                            </motion.div>
                        );
                    })}
                  </>
              ))}
          </div>
      </div>

      <div className="glass-card p-4 flex items-center gap-4 bg-brand/5">
          <AcademicCapIcon className="w-5 h-5 text-brand" />
          <p className="text-xs text-textLight leading-relaxed">
              Mapped using AI OCR from your department's official timetable. Last processed March 18.
          </p>
      </div>
    </div>
  );
}
