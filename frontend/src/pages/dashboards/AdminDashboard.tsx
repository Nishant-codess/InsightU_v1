import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { UsersIcon, BuildingLibraryIcon, CalendarDaysIcon, ChartBarIcon, CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';

// Admin-specific stats
const mockAdminStats = {
    totalUsers: 1250,
    totalStudents: 1100,
    totalTeachers: 120,
    activeSections: 42,
    systemUptime: '99.9%'
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [formData, setFormData] = useState({ year: 2, batch: 'Batch 1' });

  const statCards = [
      { label: 'Total Users', value: mockAdminStats.totalUsers, icon: UsersIcon, color: 'text-blue-400', bg: 'bg-blue-400/10' },
      { label: 'Active Sections', value: mockAdminStats.activeSections, icon: BuildingLibraryIcon, color: 'text-brand', bg: 'bg-brand/10' },
      { label: 'Timetables Active', value: 8, icon: CalendarDaysIcon, color: 'text-purple-400', bg: 'bg-purple-400/10' },
      { label: 'System Health', value: mockAdminStats.systemUptime, icon: ChartBarIcon, color: 'text-green-400', bg: 'bg-green-400/10' }
  ];

  const handleUpload = (e: React.FormEvent) => {
      e.preventDefault();
      setUploadStatus('uploading');
      // Simulate real upload & processing logic
      setTimeout(() => setUploadStatus('success'), 2000);
  };

  return (
    <div className="space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-3xl font-bold text-white tracking-tight text-glow">Admin Control Center</h1>
            <p className="text-textLight mt-1 text-sm bg-surface/50 px-3 py-1 rounded inline-block border border-white/5">Administrator: {user?.email}</p>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         {statCards.map((stat, i) => (
             <motion.div 
               key={stat.label}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className="glass-card p-5 flex items-center gap-4 group hover:border-brand/40 transition-all cursor-default"
             >
                 <div className={`p-4 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                     <stat.icon className={`w-8 h-8 ${stat.color}`} />
                 </div>
                 <div>
                     <p className="text-textLight text-sm font-medium">{stat.label}</p>
                     <p className="text-2xl font-bold text-white">{stat.value}</p>
                 </div>
             </motion.div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Req 22.1.1: Timetable Management */}
          <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="glass-card p-6 lg:col-span-2"
          >
              <div className="flex items-center gap-3 mb-6">
                  <CalendarDaysIcon className="w-6 h-6 text-brand" />
                  <h2 className="text-xl font-semibold text-white">Upload New Timetable</h2>
              </div>
              
              <form onSubmit={handleUpload} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-textLight uppercase tracking-wider">Academic Year</label>
                          <select 
                            className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand/50 outline-none"
                            value={formData.year}
                            onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                          >
                              <option value={1}>Year 1</option>
                              <option value={2}>Year 2</option>
                              <option value={3}>Year 3</option>
                              <option value={4}>Year 4</option>
                          </select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-textLight uppercase tracking-wider">Cohort Batch</label>
                          <select 
                            className="w-full bg-surface border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand/50 outline-none"
                            value={formData.batch}
                            onChange={(e) => setFormData({...formData, batch: e.target.value})}
                          >
                              <option>Batch 1</option>
                              <option>Batch 2</option>
                          </select>
                      </div>
                  </div>

                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-brand/40 transition-colors cursor-pointer group">
                      <CloudArrowUpIcon className="w-12 h-12 text-gray-500 mx-auto group-hover:text-brand transition-colors mb-4" />
                      <p className="text-white font-medium">Click or drag PDF/Image timetable here</p>
                      <p className="text-xs text-textLight mt-1">Our AI will automatically map the Day Order logic</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <p className="text-xs text-textLight italic">Supported formats: PDF, PNG, JPG (Max 5MB)</p>
                      <Button 
                        type="submit" 
                        disabled={uploadStatus === 'uploading'}
                        className="min-w-[140px]"
                      >
                         {uploadStatus === 'uploading' ? 'Processing...' : uploadStatus === 'success' ? 'Uploaded!' : 'Start Mapping'}
                      </Button>
                  </div>

                  {uploadStatus === 'success' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-400/10 border border-green-400/20 p-4 rounded-xl flex items-center gap-3"
                      >
                          <CheckCircleIcon className="w-5 h-5 text-green-400" />
                          <p className="text-sm text-green-400">Timetable successfully mapped to Year {formData.year} {formData.batch}!</p>
                      </motion.div>
                  )}
              </form>
          </motion.div>
          <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2 }}
           className="glass-card p-6"
          >
              <h2 className="text-lg font-semibold text-white mb-4">Platform Overview</h2>
              <div className="space-y-4">
                  <div className="p-4 bg-surface/40 rounded-lg border border-white/5">
                      <p className="text-white font-medium">User Growth</p>
                      <p className="text-sm text-textLight">+12% this month</p>
                  </div>
                  <div className="p-4 bg-surface/40 rounded-lg border border-white/5">
                      <p className="text-white font-medium">API Usage</p>
                      <p className="text-sm text-textLight">45.2k requests / 24h</p>
                  </div>
              </div>
          </motion.div>

          <motion.div 
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.3 }}
           className="glass-card p-6"
          >
              <h2 className="text-lg font-semibold text-white mb-4">Quick Links</h2>
              <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface/60 rounded-xl border border-white/5 hover:border-brand/30 transition-all cursor-pointer">
                      <p className="text-white font-medium text-sm">System Logs</p>
                  </div>
                  <div className="p-4 bg-surface/60 rounded-xl border border-white/5 hover:border-brand/30 transition-all cursor-pointer">
                      <p className="text-white font-medium text-sm">Role Settings</p>
                  </div>
                  <div className="p-4 bg-surface/60 rounded-xl border border-white/5 hover:border-brand/30 transition-all cursor-pointer">
                      <p className="text-white font-medium text-sm">Backup Status</p>
                  </div>
                  <div className="p-4 bg-surface/60 rounded-xl border border-white/5 hover:border-brand/30 transition-all cursor-pointer">
                      <p className="text-white font-medium text-sm">Security Audit</p>
                  </div>
              </div>
          </motion.div>
      </div>

    </div>
  );
}
