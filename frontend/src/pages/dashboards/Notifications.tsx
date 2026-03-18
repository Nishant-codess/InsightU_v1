import { motion } from 'framer-motion';
import { 
  BellIcon, 
  AcademicCapIcon, 
  ExclamationTriangleIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline';

export default function Notifications() {
  const notifications = [
    { 
        id: 1, 
        title: 'New Lecture Notes Uploaded', 
        desc: 'Dr. Sameer uploaded "Quantum Mechanics - Part 2" to your Physics feed.', 
        time: '12 mins ago', 
        type: 'academic',
        priority: 'high'
    },
    { 
        id: 2, 
        title: 'Timetable Update', 
        desc: 'Admin has updated the Day 4 schedule for Section A2.', 
        time: '1 hour ago', 
        type: 'admin',
        priority: 'medium'
    },
    { 
        id: 3, 
        title: 'Society Event: TechFest 2026', 
        desc: 'Join the CS society for the annual hackathon registration.', 
        time: '3 hours ago', 
        type: 'general',
        priority: 'low'
    },
    { 
        id: 4, 
        title: 'Attendance Alert', 
        desc: 'Your attendance in Calculus II has dropped below 75%.', 
        time: 'Yesterday', 
        type: 'urgent',
        priority: 'high'
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
        case 'academic': return <AcademicCapIcon className="w-5 h-5 text-brand" />;
        case 'admin': return <MegaphoneIcon className="w-5 h-5 text-blue-400" />;
        case 'urgent': return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
        default: return <BellIcon className="w-5 h-5 text-textLight" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand/10 rounded-2xl border border-brand/20">
              <BellIcon className="w-8 h-8 text-brand" />
          </div>
          <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Institutional Alerts</h1>
              <p className="text-textLight">Stay updated with your academic and social circle.</p>
          </div>
      </div>

      <div className="space-y-4">
          {notifications.map((notif, i) => (
              <motion.div 
                key={notif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-5 flex gap-4 hover:border-brand/40 transition-all cursor-pointer group"
              >
                  <div className={`p-3 rounded-xl bg-surface border border-white/5 h-fit group-hover:bg-brand/10 transition-colors`}>
                      {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                          <h3 className="text-white font-bold">{notif.title}</h3>
                          <span className="text-[10px] text-textLight font-medium">{notif.time}</span>
                      </div>
                      <p className="text-sm text-textLight leading-relaxed">{notif.desc}</p>
                      <div className="pt-2 flex gap-2">
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                              notif.priority === 'high' ? 'text-red-400 border-red-400/20 bg-red-400/10' :
                              notif.priority === 'medium' ? 'text-blue-400 border-blue-400/20 bg-blue-400/10' :
                              'text-textLight border-white/10 bg-white/5'
                          }`}>
                              {notif.priority} Priority
                          </span>
                      </div>
                  </div>
              </motion.div>
          ))}
      </div>
    </div>
  );
}
