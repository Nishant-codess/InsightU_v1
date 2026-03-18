import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  ArcElement,
} from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';
import { AcademicCapIcon, ExclamationCircleIcon, HandThumbUpIcon, ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, RadialLinearScale, ArcElement
);

// Mock data spanning Requirement 4 & 10 mappings
const mockAnalytics = {
  academicHealthScore: 78.5,
  weakSubjects: ['Physics', 'Advanced Math'],
  weakTopics: [
    { subject: 'Physics', topic: 'Quantum Mechanics' },
    { subject: 'Advanced Math', topic: 'Stochastic Calculus' }
  ],
  recommendations: [
    "Review Lecture Notes for Physics: Quantum Mechanics",
    "Complete missing Quizzes for Advanced Math",
    "Schedule Teacher consultation hours for Stochastic Calculus concepts"
  ],
  subjectPerformance: {
     labels: ['Math', 'Physics', 'Computer Science', 'Chemistry', 'English'],
     datasets: [
       {
         label: 'Current Performance (%)',
         data: [85, 55, 92, 78, 88],
         backgroundColor: 'rgba(102, 252, 241, 0.2)',
         borderColor: 'rgba(102, 252, 241, 1)',
         borderWidth: 2,
       }
     ]
  },
  trendData: {
     labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
     datasets: [
        {
          label: 'Academic Health Trend',
          data: [65, 68, 72, 75, 78.5],
          borderColor: '#45A29E',
          backgroundColor: 'rgba(69, 162, 158, 0.5)',
          tension: 0.4
        }
     ]
  }
};

const mockTimetable = {
   currentDayOrder: 'Day 3',
   schedule: [
      { time: '09:00 AM', subject: 'Computer Science', room: 'Lab 4' },
      { time: '10:00 AM', subject: 'Advanced Math', room: 'Room 201' },
      { time: '11:15 AM', subject: 'Physics', room: 'Lab 2' },
      { time: '01:00 PM', subject: 'Free Slot / Library', room: '-' }
   ]
};

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [data] = useState(mockAnalytics);
  const [schedule] = useState(mockTimetable);

  // Req 22.2.2: Section A1/A2 logic
  const displaySection = `${user?.student?.section || 'A'}${user?.student?.batch === 'Batch 1' ? '1' : '2'}`;

  return (
    <div className="space-y-6">
      
      {/* Header Profile Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
         <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back, {user?.name?.split(' ')[0] || 'Student'}</h1>
            <p className="text-textLight mt-1">Here's your academic performance overview for today.</p>
         </div>
         <Link to="/performance" className="group">
             <div className="flex bg-surface/50 border border-white/10 rounded-xl px-5 py-3 backdrop-blur-sm items-center gap-3 group-hover:border-brand/50 transition-all cursor-pointer">
                 <div className="p-2 bg-brand/10 rounded-lg group-hover:scale-110 transition-transform">
                     <AcademicCapIcon className="h-6 w-6 text-brand" />
                 </div>
                 <div>
                     <p className="text-xs text-textLight uppercase tracking-wider font-semibold">Overall Health</p>
                     <p className="text-2xl font-bold text-white">{data.academicHealthScore}%</p>
                 </div>
                 <ArrowRightIcon className="w-4 h-4 text-brand opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
             </div>
         </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart Column */}
          <div className="lg:col-span-2 space-y-6">
              
              <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="glass-card p-6"
              >
                 <h2 className="text-lg font-semibold text-white mb-4">Performance Trends (Rolling 5 Weeks)</h2>
                 <div className="h-64">
                    <Line 
                       data={data.trendData} 
                       options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }} 
                    />
                 </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: 0.1 }}
                   className="glass-card p-6 flex flex-col items-center justify-center"
                 >
                    <h2 className="text-lg font-semibold text-white mb-2 self-start">Subject Distribution</h2>
                    <div className="h-56 w-full relative">
                        <Radar 
                          data={data.subjectPerformance} 
                          options={{ maintainAspectRatio: false, scales: { r: { angleLines: { color: 'rgba(255,255,255,0.1)' }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#C5C6C7' }, ticks: { display: false } } }, plugins: { legend: { display: false } } }} 
                        />
                    </div>
                 </motion.div>

                 <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card p-6"
                 >
                     <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                         <ExclamationCircleIcon className="w-5 h-5 text-red-400 mr-2" />
                         Action Required
                     </h2>
                     <div className="space-y-3">
                         {data.weakTopics.map((item, i) => (
                             <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                 <p className="text-xs text-red-300 uppercase tracking-wider font-semibold">{item.subject}</p>
                                 <p className="text-sm text-red-100 font-medium">{item.topic}</p>
                             </div>
                         ))}
                     </div>
                 </motion.div>

              </div>
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-6">
              
              <Link to="/timetable" className="block group">
                  <motion.div 
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="glass-card p-6 group-hover:border-brand/50 transition-all cursor-pointer"
                  >
                      <div className="flex justify-between items-center mb-4">
                          <h2 className="text-lg font-semibold text-white flex items-center">
                             <ClockIcon className="w-5 h-5 text-brand mr-2" />
                             {schedule.currentDayOrder} Schedule
                          </h2>
                          <ArrowRightIcon className="w-4 h-4 text-brand opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="relative border-l-2 border-surface ml-3 space-y-6">
                          {schedule.schedule.map((slot, i) => (
                              <div key={i} className="relative pl-6">
                                  <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-brand ring-4 ring-background"></span>
                                  <p className="text-sm font-semibold text-white">{slot.subject}</p>
                                  <p className="text-xs text-textLight">{slot.time} • {slot.room}</p>
                              </div>
                          ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/5 text-center">
                          <p className="text-[10px] text-textLight uppercase tracking-widest font-bold group-hover:text-brand transition-colors">View Full Cycle (Section {displaySection})</p>
                      </div>
                  </motion.div>
              </Link>

              <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.1 }}
               className="glass-card p-6 bg-gradient-to-b from-brand/10 to-transparent border-t-brand/30"
              >
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                     <HandThumbUpIcon className="w-5 h-5 text-brand mr-2" />
                     AI Recommendations
                  </h2>
                  <ul className="space-y-3">
                      {data.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-textLight flex items-start">
                             <span className="text-brand mr-2 mt-0.5">•</span>
                             <span className="leading-relaxed">{rec}</span>
                          </li>
                      ))}
                  </ul>
              </motion.div>

          </div>

      </div>
    </div>
  );
}
