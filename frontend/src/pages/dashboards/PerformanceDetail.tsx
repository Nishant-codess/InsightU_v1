import { motion } from 'framer-motion';
import { ChartBarIcon, ArrowTrendingUpIcon, BeakerIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/useAuthStore';

export default function PerformanceDetail() {
  const { user } = useAuthStore();

  const subjects = [
    { name: 'Physics 101', score: 85, trend: '+5%', status: 'Excellent' },
    { name: 'Calculus II', score: 72, trend: '-2%', status: 'Improving' },
    { name: 'Computer Science', score: 91, trend: '+3%', status: 'Superior' },
    { name: 'Electronic Circuits', score: 64, trend: 'stable', status: 'Attention Needed' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand/10 rounded-2xl border border-brand/20">
              <ChartBarIcon className="w-8 h-8 text-brand" />
          </div>
          <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Academic Health Analysis</h1>
              <p className="text-textLight">Detailed performance breakdown for {user?.name}</p>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 border-brand/20">
              <p className="text-textLight text-sm font-medium mb-1">Overall Vitality</p>
              <p className="text-4xl font-bold text-brand">84%</p>
              <div className="h-2 bg-white/5 rounded-full mt-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '84%' }}
                    className="h-full bg-brand"
                  />
              </div>
          </div>
          <div className="glass-card p-6">
              <p className="text-textLight text-sm font-medium mb-1">Consistency Score</p>
              <p className="text-4xl font-bold text-blue-400">92/100</p>
              <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                  <ArrowTrendingUpIcon className="w-3 h-3" />
                  Increasing trend
              </p>
          </div>
          <div className="glass-card p-6">
              <p className="text-textLight text-sm font-medium mb-1">Peer Percentile</p>
              <p className="text-4xl font-bold text-purple-400">Top 12%</p>
              <p className="text-xs text-textLight mt-2 text-opacity-60">Based on Section A1 cohort</p>
          </div>
      </div>

      <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/5">
              <h2 className="text-lg font-semibold text-white">Subject Breakdown</h2>
          </div>
          <div className="divide-y divide-white/5">
              {subjects.map((s, i) => (
                  <motion.div 
                    key={s.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                      <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg bg-surface border border-white/5`}>
                              <BeakerIcon className="w-5 h-5 text-textLight" />
                          </div>
                          <div>
                              <p className="text-white font-medium">{s.name}</p>
                              <p className="text-xs text-textLight">{s.status}</p>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="text-xl font-bold text-white">{s.score}%</p>
                          <p className={`text-xs ${s.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                              {s.trend}
                          </p>
                      </div>
                  </motion.div>
              ))}
          </div>
      </div>
    </div>
  );
}
