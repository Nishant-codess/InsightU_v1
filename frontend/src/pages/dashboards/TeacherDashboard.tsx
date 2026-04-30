import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  AcademicCapIcon, 
  UserGroupIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/useAuthStore';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const stats = [
    { label: 'Active Classrooms', value: '0', icon: AcademicCapIcon, color: 'bg-blue-500/20 text-blue-400' },
    { label: 'Total Students', value: '0', icon: UserGroupIcon, color: 'bg-green-500/20 text-green-400' },
    { label: 'Whiteboards', value: '0', icon: DocumentTextIcon, color: 'bg-purple-500/20 text-purple-400' },
    { label: 'Posts', value: '0', icon: ChartBarIcon, color: 'bg-orange-500/20 text-orange-400' },
  ];

  const quickActions = [
    {
      title: 'Create Classroom',
      description: 'Start a new classroom for your students',
      icon: AcademicCapIcon,
      action: () => navigate('/classroom'),
      color: 'bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30'
    },
    {
      title: 'Create Whiteboard',
      description: 'Share code and collaborate in real-time',
      icon: DocumentTextIcon,
      action: () => navigate('/whiteboard'),
      color: 'bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30'
    },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6"
      >
        <h1 className="text-3xl font-bold text-white mb-2 font-outfit">
          Welcome, {user?.teacher?.name || 'Teacher'}
        </h1>
        <p className="text-textLight">
          {user?.teacher?.department} • {user?.teacher?.subjects?.join(', ')}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-textLight mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4 font-outfit">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              onClick={action.action}
              className={`glass-panel p-6 border ${action.color} hover:scale-[1.02] transition-all text-left group`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <action.icon className="h-6 w-6 text-brand" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    {action.title}
                    <PlusIcon className="h-4 w-4 text-brand" />
                  </h3>
                  <p className="text-sm text-textLight">{action.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-panel p-6">
        <h2 className="text-xl font-semibold text-white mb-4 font-outfit">Recent Activity</h2>
        <div className="text-center py-12 text-textLight">
          <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No recent activity</p>
          <p className="text-sm mt-1">Create a classroom or whiteboard to get started</p>
        </div>
      </div>
    </div>
  );
}
