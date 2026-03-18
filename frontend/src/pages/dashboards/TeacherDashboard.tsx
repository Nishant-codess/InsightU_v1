import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { UsersIcon, BookOpenIcon, BoltIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';

// Simulated Teacher Platform Overviews Mapped logically
const mockStats = {
    activeStudents: 142,
    quizzesCompleted: 14,
    assignmentsPosted: 8,
    averageClassHealth: 82.4
};

const mockRecentClasses = [
    { id: 1, subject: 'Computer Science', topic: 'Data Structures', date: 'Today, 10:00 AM' },
    { id: 2, subject: 'Computer Science', topic: 'Algorithms', date: 'Yesterday, 11:15 AM' }
];

export default function TeacherDashboard() {
  const { user } = useAuthStore();

  const statCards = [
      { label: 'Active Students', value: mockStats.activeStudents, icon: UsersIcon, color: 'text-blue-400', bg: 'bg-blue-400/10' },
      { label: 'Class Health', value: `${mockStats.averageClassHealth}%`, icon: BoltIcon, color: 'text-brand', bg: 'bg-brand/10' },
      { label: 'Live Quizzes Built', value: mockStats.quizzesCompleted, icon: DocumentTextIcon, color: 'text-purple-400', bg: 'bg-purple-400/10' },
      { label: 'Notes Uploaded', value: mockStats.assignmentsPosted, icon: BookOpenIcon, color: 'text-green-400', bg: 'bg-green-400/10' }
  ];

  return (
    <div className="space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Teacher Portal</h1>
            <p className="text-textLight mt-1 text-sm bg-surface/50 px-3 py-1 rounded inline-block border border-white/5">{user?.email}</p>
         </div>
         <div className="flex gap-3 w-full md:w-auto">
             <Button variant="outline" className="flex-1 md:flex-none">Create Quiz</Button>
             <Button className="flex-1 md:flex-none">Upload Material</Button>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         {statCards.map((stat, i) => (
             <motion.div 
               key={stat.label}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className="glass-card p-5 flex items-center gap-4"
             >
                 <div className={`p-4 rounded-xl ${stat.bg}`}>
                     <stat.icon className={`w-8 h-8 ${stat.color}`} />
                 </div>
                 <div>
                     <p className="text-textLight text-sm font-medium">{stat.label}</p>
                     <p className="text-2xl font-bold text-white">{stat.value}</p>
                 </div>
             </motion.div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2 }}
           className="glass-card p-6"
          >
              <h2 className="text-lg font-semibold text-white mb-4">Recent Lecture Logs</h2>
              <div className="space-y-4">
                  {mockRecentClasses.map((ac) => (
                      <div key={ac.id} className="flex justify-between items-center p-4 bg-surface/40 rounded-lg border border-white/5 hover:border-brand/20 transition-colors cursor-pointer">
                          <div>
                              <p className="text-white font-medium">{ac.topic}</p>
                              <p className="text-sm text-textLight">{ac.subject}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-textLight">{ac.date}</p>
                              <span className="text-brand text-xs font-semibold mt-1 inline-block hover:underline">View Analytics &rarr;</span>
                          </div>
                      </div>
                  ))}
              </div>
          </motion.div>

          <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.3 }}
           className="glass-card p-6 bg-gradient-to-br from-brand/5 to-transparent"
          >
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4 h-[calc(100%-2rem)]">
                  <div className="bg-surface/60 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-brand/10 hover:border-brand/30 transition-all group">
                      <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <BookOpenIcon className="w-6 h-6 text-brand" />
                      </div>
                      <span className="text-white font-medium text-sm">Upload Notes Document</span>
                  </div>
                  <div className="bg-surface/60 rounded-xl p-4 border border-white/5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-400/10 hover:border-blue-400/30 transition-all group">
                      <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <DocumentTextIcon className="w-6 h-6 text-blue-400" />
                      </div>
                      <span className="text-white font-medium text-sm">Distribute Assignment</span>
                  </div>
              </div>
          </motion.div>
      </div>

    </div>
  );
}
