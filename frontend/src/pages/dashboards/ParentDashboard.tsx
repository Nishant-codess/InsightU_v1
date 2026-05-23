import { motion } from 'framer-motion';
import { 
  UserIcon, 
  ChartBarIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/useAuthStore';
import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export default function ParentDashboard() {
  const { user, portalData, token } = useAuthStore();
  const [calendarDays, setCalendarDays] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/calendar-days`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setCalendarDays(data))
      .catch(console.error);
  }, [token]);

  if (!portalData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-panel p-8 text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-white">Loading child's data...</p>
        </div>
      </div>
    );
  }

  const profile = portalData.profile || {};
  const attendance = portalData.attendance || [];
  const marks = portalData.marks || [];

  // Find today's day order
  const today = new Date();
  const todayCalDay = calendarDays.find(cd => {
    const [yyyy, mm, dd] = cd.date.split('T')[0].split('-');
    const y = parseInt(yyyy, 10);
    const m = parseInt(mm, 10) - 1;
    const d = parseInt(dd, 10);
    return y === today.getFullYear() && 
           m === today.getMonth() && 
           d === today.getDate();
  });

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-outfit">
            Welcome, {user?.parent?.name}
          </h1>
          <p className="text-textLight flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-brand" />
            Monitoring: <span className="text-white font-medium">{profile.name || user?.parent?.childSrmEmail}</span>
          </p>
        </div>

        {/* Today's Day Order Highlight */}
        {todayCalDay && (
          <div className="bg-gradient-to-br from-emerald-900/40 to-black/60 border border-emerald-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex items-center gap-5">
             <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/30">
                <ClockIcon className="w-8 h-8 text-emerald-400" />
             </div>
             <div>
                <p className="text-emerald-400/80 text-xs font-bold uppercase tracking-widest mb-1">Today's Academic Schedule</p>
                <div className="flex items-end gap-3">
                  <h2 className="text-3xl font-black text-emerald-50 tracking-tight">
                    {todayCalDay.dayOrder ? `Day Order ${todayCalDay.dayOrder}` : 'No Day Order'}
                  </h2>
                  {todayCalDay.name && (
                     <span className="text-sm font-medium text-emerald-200 mb-1 max-w-[200px] truncate" title={todayCalDay.name}>
                       • {todayCalDay.name}
                     </span>
                  )}
                </div>
             </div>
          </div>
        )}
      </motion.div>

      {/* Child Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-4 font-outfit flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-brand" />
          Child's Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-textLight">Name</p>
            <p className="text-white font-medium">{profile.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-textLight">Registration Number</p>
            <p className="text-white font-medium">{profile.registrationNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-textLight">Department</p>
            <p className="text-white font-medium">{profile.department || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-textLight">Program</p>
            <p className="text-white font-medium">{profile.program || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-textLight">Semester</p>
            <p className="text-white font-medium">{profile.semester || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-textLight">Batch</p>
            <p className="text-white font-medium">{profile.batch || 'N/A'}</p>
          </div>
        </div>
      </motion.div>

      {/* Attendance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-4 font-outfit flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-brand" />
          Attendance
        </h2>
        {attendance.length > 0 ? (
          <div className="space-y-3">
            {attendance.map((item: any, index: number) => (
              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{item.subject}</p>
                    <p className="text-sm text-textLight">
                      {item.attended} / {item.total} classes
                    </p>
                  </div>
                  <div className={`text-2xl font-bold ${
                    item.percentage >= 75 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {item.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-textLight text-center py-8">No attendance data available</p>
        )}
      </motion.div>

      {/* Marks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-6"
      >
        <h2 className="text-xl font-semibold text-white mb-4 font-outfit flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-brand" />
          Internal Marks
        </h2>
        {marks.length > 0 ? (
          <div className="space-y-4">
            {marks.map((subject: any, index: number) => (
              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-white font-medium mb-3">{subject.subject}</p>
                <div className="space-y-2">
                  {subject.assessments?.map((assessment: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-textLight">{assessment.name}</span>
                      <span className="text-white font-medium">
                        {assessment.scored} / {assessment.max}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-textLight text-center py-8">No marks data available</p>
        )}
      </motion.div>
    </div>
  );
}
