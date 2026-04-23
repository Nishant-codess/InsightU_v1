import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
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
import { 
  AcademicCapIcon, 
  ExclamationCircleIcon, 
  HandThumbUpIcon, 
  ClockIcon, 
  ArrowRightIcon, 
  CloudArrowUpIcon, 
  CheckCircleIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  MoonIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import PortalSyncModal from '../../components/timetable/PortalSyncModal';
import QuizLibrary from '../../components/quiz/QuizLibrary';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, RadialLinearScale, ArcElement
);

export default function StudentDashboard() {
  const { user, token } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // World Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  // Timetable Sync States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  // Portal Sync Modal
  const [showPortalSyncModal, setShowPortalSyncModal] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Planning State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planning'>('dashboard');
  const [holidays, setHolidays] = useState<any[]>([]);
  const [plannerForm, setPlannerForm] = useState({
      startDate: '',
      endDate: '',
      attendanceInputs: {} as Record<string, number>
  });
  const [riskData, setRiskData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // World Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodaySchedule = async () => {
    try {
        const res = await axios.get('/api/student/today-schedule', {
            headers: { Authorization: `Bearer ${token}` }
        });
        setTodaySchedule(res.data);
    } catch (err) {
        console.error('Failed to fetch schedule:', err);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
        try {
            const [dashboardRes, holidayRes] = await Promise.all([
                axios.get('/api/student/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/student/holidays', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setData(dashboardRes.data.analytics);
            setHolidays(holidayRes.data.holidays || []);
            await fetchTodaySchedule();
        } catch (err) {
            console.error('Data fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    fetchAllData();

    // Auto-refresh schedule every 60 seconds
    const interval = setInterval(fetchTodaySchedule, 60000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (data?.subjectMarks && Object.keys(plannerForm.attendanceInputs).length === 0) {
        const initialAttendance: Record<string, number> = {};
        Object.keys(data.subjectMarks).forEach(sub => {
            initialAttendance[sub] = 85; 
        });
        setPlannerForm(prev => ({ ...prev, attendanceInputs: initialAttendance }));
    }
  }, [data]);

  const handleRiskAnalysis = async () => {
    if (!plannerForm.startDate || !plannerForm.endDate) return;
    setIsAnalyzing(true);
    try {
        const res = await axios.post('/api/student/holiday-planner/risk', {
            startDate: plannerForm.startDate,
            endDate: plannerForm.endDate,
            currentAttendance: plannerForm.attendanceInputs
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setRiskData(res.data);
    } catch (err) {
        console.error('Risk analysis failed:', err);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleTimetableUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0]) return;
      const file = e.target.files[0];
      setUploadStatus('uploading');
      const payload = new FormData();
      payload.append('file', file);
      try {
          await axios.post('/api/student/timetable/upload-personal', payload, {
              headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
          });
          setUploadStatus('success');
          await fetchTodaySchedule();
          setTimeout(() => setUploadStatus('idle'), 3000);
      } catch (err: any) {
          setUploadStatus('error');
          alert(err.response?.data?.error || 'Upload failed');
      }
  };

  if (loading) return <div className="text-white p-10 animate-pulse">Initializing Deterministic Dashboard...</div>;

  const trendData = data ? {    labels: data.trends.map((t: any) => new Date(t.assessmentDate).toLocaleDateString()),
    datasets: [{
         label: 'Performance Trend',
         data: data.trends.map((t: any) => t.percentage),
         borderColor: '#45A29E',
         backgroundColor: 'rgba(69, 162, 158, 0.5)',
         tension: 0.4
    }]
  } : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Portal Sync Modal */}
      {showPortalSyncModal && (
        <PortalSyncModal
          mode="attendance"
          token={token ?? ''}
          onClose={() => setShowPortalSyncModal(false)}
          onSuccess={(result) => {
            setShowPortalSyncModal(false);
            setLastSyncedAt(result.syncedAt ?? new Date().toISOString());
            fetchTodaySchedule();
          }}
        />
      )}
      {/* Header Profile Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
         <div className="flex items-center gap-8">
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter">HELLO, {user?.name?.split(' ')[0].toUpperCase() || 'STUDENT'}</h1>
              <p className="text-textLight mt-1 font-medium bg-white/5 w-fit px-3 py-1 rounded-full text-xs">DETERMINISTIC SYNC ACTIVE • ASIA/KOLKATA</p>
            </div>
            {/* World Clock */}
            <div className="flex flex-col items-center px-6 py-4 bg-surface/50 border border-white/10 rounded-2xl backdrop-blur-xl">
              <ClockIcon className="w-6 h-6 text-brand mb-2" />
              <p className="text-[10px] text-textLight uppercase tracking-widest font-black mb-1">Asia/Kolkata</p>
              <p className="text-2xl font-black text-white tabular-nums">
                {currentTime.toLocaleTimeString('en-IN', { 
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
              <p className="text-[9px] text-textLight/50 uppercase tracking-widest mt-1">
                {currentTime.toLocaleDateString('en-IN', { 
                  timeZone: 'Asia/Kolkata',
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                })}
              </p>
            </div>
         </div>
         <div className="flex items-center gap-4">
             {/* Refresh from SRM Portal button */}
             <button
               onClick={() => setShowPortalSyncModal(true)}
               className="flex items-center gap-2 px-4 py-3 bg-surface/50 border border-white/10 rounded-2xl text-xs font-black text-textLight uppercase tracking-widest hover:border-brand/40 hover:text-brand transition-all"
             >
               <ArrowPathIcon className="w-4 h-4" />
               Refresh from SRM Portal
             </button>
             {lastSyncedAt && (
               <p className="text-[9px] text-textLight/50 uppercase tracking-widest hidden md:block">
                 Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}
               </p>
             )}
             {data && (
                 <Link to="/performance" className="group">
                     <div className="flex bg-surface/50 border border-white/10 rounded-2xl px-6 py-4 backdrop-blur-xl items-center gap-4 group-hover:border-brand/50 transition-all cursor-pointer shadow-2xl">
                         <div className="p-3 bg-brand/10 rounded-xl group-hover:scale-110 transition-transform">
                             <AcademicCapIcon className="h-7 w-7 text-brand" />
                         </div>
                         <div>
                             <p className="text-[10px] text-textLight uppercase tracking-[0.2em] font-black">Academic Health</p>
                             <p className="text-3xl font-black text-white">{data.academicHealthScore}%</p>
                         </div>
                         <ArrowRightIcon className="w-5 h-5 text-brand opacity-0 group-hover:opacity-100 transition-all ml-2" />
                     </div>
                 </Link>
             )}
         </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1.5 bg-surface/80 border border-white/5 w-fit rounded-2xl backdrop-blur-2xl shadow-inner">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-brand text-background shadow-xl shadow-brand/20 scale-[1.02]' : 'text-textLight hover:text-white'}`}
          >
              <ChartBarIcon className="w-4 h-4" />
              Insights
          </button>
          <button 
            onClick={() => setActiveTab('planning')}
            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === 'planning' ? 'bg-brand text-background shadow-xl shadow-brand/20 scale-[1.02]' : 'text-textLight hover:text-white'}`}
          >
              <CalendarIcon className="w-4 h-4" />
              Planning
          </button>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
              {trendData && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 bg-gradient-to-br from-surface to-background border-white/5">
                   <div className="flex justify-between items-center mb-8">
                       <h2 className="text-xl font-black text-white tracking-tight uppercase">Performance Wave</h2>
                       <ChartBarIcon className="w-6 h-6 text-brand/50" />
                   </div>
                   <div className="h-72">
                      <Line data={trendData} options={{ maintainAspectRatio: false, animation: { duration: 800, easing: 'easeInOutQuart' }, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#666' } }, x: { grid: { display: false }, ticks: { color: '#666' } } } }} />
                   </div>
                </motion.div>
              )}

              {/* Quiz Library Section */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
                <QuizLibrary />
              </motion.div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {data && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="glass-card p-8 flex flex-col items-center group">
                        <div className="flex justify-between w-full mb-6">
                            <h2 className="text-lg font-black text-white uppercase tracking-tighter">Weak Domains</h2>
                            <ExclamationCircleIcon className="w-6 h-6 text-red-500/50 group-hover:text-red-500 transition-colors" />
                        </div>
                        <div className="space-y-4 w-full">
                            {data.weakTopics.map((item: any, i: number) => (
                                <div key={i} className="p-5 rounded-2xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-all">
                                    <p className="text-[10px] text-red-400 uppercase tracking-widest font-black mb-1">{item.subject}</p>
                                    <p className="text-md text-white font-bold tracking-tight">{item.topic}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                 )}
                 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="glass-card p-8 flex flex-col justify-between overflow-hidden relative">
                    <SparklesIcon className="absolute -right-8 -top-8 w-40 h-40 text-brand/5 rotate-12" />
                    <div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tighter mb-6">AI Mentorship</h2>
                        <ul className="space-y-6 relative z-10">
                            {data?.recommendations?.map((rec: string, i: number) => (
                                <li key={i} className="text-sm text-textLight flex items-start gap-4 hover:translate-x-1 transition-transform">
                                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-brand shadow-glow shadow-brand/50 shrink-0" />
                                    <span className="font-medium leading-relaxed">{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                 </motion.div>
              </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
              {/* Deterministic Timetable Widget */}
              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-8 bg-gradient-to-b from-brand/5 to-transparent border-brand/10">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Daily Timeline</h2>
                        <p className="text-[10px] text-brand font-black uppercase mt-2 tracking-widest">Day Order {todaySchedule?.dayOrder || '?'}</p>
                      </div>
                      <ClockIcon className="w-8 h-8 text-brand/30" />
                  </div>

                  {todaySchedule?.status === 'HOLIDAY' ? (
                      <div className="py-20 text-center space-y-4">
                          <MoonIcon className="w-16 h-16 text-brand/20 mx-auto" />
                          <p className="text-xl font-black text-white">{todaySchedule.message}</p>
                          <p className="text-xs text-textLight uppercase tracking-widest font-bold">Enjoy your break!</p>
                      </div>
                  ) : (
                      <div className="relative border-l-[1px] border-white/10 ml-2 space-y-10">
                           {todaySchedule?.schedule?.map((period: any, i: number) => (
                               <div key={i} className={`relative pl-8 group${period.isOngoing ? ' animate-class-pulse rounded-xl' : ''}`}>
                                   <div className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full z-10 transition-all duration-500 ${period.isOngoing ? 'bg-brand scale-150 shadow-glow shadow-brand/50' : 'bg-white/10'}`} />
                                   
                                   <div className="flex justify-between items-start">
                                       <div className="space-y-0.5">
                                           <p className="text-[10px] font-black text-textLight uppercase tracking-widest">{period.time}</p>
                                           <h3 className={`text-lg font-black tracking-tight transition-colors ${period.status === 'FREE' ? 'text-white/20' : 'text-white'}`}>
                                               {period.subject}
                                           </h3>
                                           {period.status === 'CLASS' && (
                                               <p className="text-xs font-bold text-brand uppercase tracking-tighter">{period.room} • {period.type}</p>
                                           )}
                                       </div>
                                       {period.isOngoing && (
                                           <span className="bg-brand text-background text-[10px] font-black px-2 py-1 rounded-md uppercase animate-pulse">Ongoing</span>
                                       )}
                                       {period.isNext && !period.isOngoing && (
                                           <span className="border border-brand/50 text-brand text-[10px] font-black px-2 py-1 rounded-md uppercase">Up next</span>
                                       )}
                                   </div>
                               </div>
                           ))}
                           {(!todaySchedule || todaySchedule.schedule?.length === 0) && (
                               <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl">
                                   <p className="text-xs text-textLight font-bold uppercase tracking-widest italic">No schedule data yet.</p>
                               </div>
                           )}
                      </div>
                  )}

                  <div className="mt-12 pt-8 border-t border-white/5">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-4 text-center">Sync Control</h3>
                      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleTimetableUpload} />
                      
                      <div className="flex flex-col gap-3">
                          {uploadStatus === 'idle' || uploadStatus === 'error' ? (
                              <button onClick={() => fileInputRef.current?.click()} className="group w-full py-4 bg-brand/5 border border-brand/20 rounded-2xl text-[11px] font-black text-brand uppercase tracking-widest hover:bg-brand hover:text-background transition-all flex items-center justify-center gap-3">
                                 <CloudArrowUpIcon className="w-5 h-5 group-hover:-translate-y-1 transition-transform" /> 
                                 Sync My Attendance
                              </button>
                          ) : uploadStatus === 'uploading' ? (
                              <div className="w-full py-4 bg-surface border border-white/5 rounded-2xl text-[11px] font-black text-textLight text-center animate-pulse uppercase tracking-widest">Deterministic Processing...</div>
                          ) : (
                              <div className="flex items-center justify-center gap-3 text-green-400 text-[11px] font-black py-4 bg-green-400/5 rounded-2xl border border-green-400/10 uppercase tracking-widest shadow-glow shadow-green-400/5">
                                  <CheckCircleIcon className="w-5 h-5" /> Sync Complete
                              </div>
                          )}
                          <p className="text-[9px] text-textLight text-center uppercase tracking-widest leading-relaxed">
                              Upload your "My Attendance" PDF to map subjects and rooms to your specific section slots.
                          </p>
                      </div>
                  </div>
              </motion.div>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
            <section>
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-brand/10 rounded-2xl"><CalendarIcon className="w-7 h-7 text-brand" /></div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Academic Breaks</h2>
                        <p className="text-[10px] text-textLight uppercase tracking-[0.3em] font-black">Official University Holiday Mapping</p>
                    </div>
                </div>
                <div className="flex gap-6 overflow-x-auto pb-6 px-2 -mx-2 custom-scrollbar">
                    {holidays.length > 0 ? holidays.map((holiday, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="min-w-[320px] glass-card p-7 border-l-8 border-l-brand relative overflow-hidden group shadow-2xl hover:translate-y-[-4px] transition-all">
                            <SparklesIcon className="absolute -right-4 -bottom-4 w-24 h-24 text-brand/5 group-hover:scale-125 transition-transform" />
                            <p className="text-xs font-black text-brand mb-2 opacity-80 uppercase tracking-widest">{new Date(holiday.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tighter">{holiday.dayOrder === null ? 'Official Holiday' : `Day Order ${holiday.dayOrder}`}</h3>
                            <p className="text-xs text-textLight mt-3 font-bold uppercase tracking-widest">Campus Closed</p>
                        </motion.div>
                    )) : (
                        <div className="w-full p-20 glass-card text-center border-dashed border-white/10">
                            <MoonIcon className="w-12 h-12 text-white/5 mx-auto mb-4" />
                            <p className="text-sm font-black text-white/20 uppercase tracking-[0.2em]">No upcoming breaks found in current version.</p>
                        </div>
                    )}
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-10 bg-gradient-to-br from-brand/5 via-transparent to-transparent border-brand/10 shadow-[0_32px_64px_-12px_rgba(102,252,241,0.05)]">
                    <div className="flex items-center gap-5 mb-10">
                        <div className="p-4 bg-brand rounded-2xl shadow-xl shadow-brand/20"><AdjustmentsHorizontalIcon className="w-7 h-7 text-background" /></div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-tight">Vacation Predictor</h2>
                            <p className="text-[10px] text-textLight uppercase font-black tracking-widest">Attendance Impact Simulation</p>
                        </div>
                    </div>
                    
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-textLight uppercase tracking-widest flex items-center gap-2 px-1">
                                    <div className="h-1 w-1 bg-brand rounded-full" /> Departure
                                </label>
                                <input type="date" className="w-full bg-background border border-white/10 rounded-2xl p-4 text-white text-sm font-bold focus:border-brand/50 transition-all outline-none" value={plannerForm.startDate} onChange={(e) => setPlannerForm({...plannerForm, startDate: e.target.value})} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-textLight uppercase tracking-widest flex items-center gap-2 px-1">
                                    <div className="h-1 w-1 bg-brand rounded-full" /> Return
                                </label>
                                <input type="date" className="w-full bg-background border border-white/10 rounded-2xl p-4 text-white text-sm font-bold focus:border-brand/50 transition-all outline-none" value={plannerForm.endDate} onChange={(e) => setPlannerForm({...plannerForm, endDate: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-5">
                            <label className="text-[10px] font-black text-white uppercase tracking-[0.2em] block bg-white/5 p-3 rounded-xl text-center border border-white/5">Subject Performance (Current %)</label>
                            <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                                {Object.keys(plannerForm.attendanceInputs).length > 0 ? Object.keys(plannerForm.attendanceInputs).map(subject => (
                                    <div key={subject} className="flex items-center justify-between p-4 bg-surface/40 hover:bg-surface/60 rounded-2xl border border-white/5 transition-all group">
                                        <span className="text-xs font-black text-white truncate max-w-[200px] uppercase tracking-tight group-hover:text-brand transition-colors">{subject}</span>
                                        <div className="flex items-center gap-3">
                                            <input type="number" className="w-20 bg-background border border-white/10 rounded-xl p-2 text-xs font-black text-white text-center focus:border-brand outline-none" min="0" max="100" value={plannerForm.attendanceInputs[subject]} onChange={(e) => setPlannerForm({...plannerForm, attendanceInputs: { ...plannerForm.attendanceInputs, [subject]: parseFloat(e.target.value) }})}/>
                                            <span className="text-[10px] font-black text-textLight">%</span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center py-10 text-xs text-textLight font-black uppercase tracking-widest italic opacity-30">Loading subject data...</p>
                                )}
                            </div>
                        </div>

                        <button onClick={handleRiskAnalysis} disabled={isAnalyzing || !plannerForm.startDate} className="w-full py-6 bg-brand text-background rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-brand/40 hover:scale-[1.01] hover:brightness-110 active:scale-100 transition-all disabled:opacity-50 disabled:grayscale">
                            {isAnalyzing ? "Processing..." : "Evaluate Survival Risk"}
                        </button>
                    </div>
                </motion.div>

                <div className="space-y-12">
                    {riskData ? (
                        <div className="space-y-8">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`glass-card p-10 border-4 shadow-2xl relative overflow-hidden ${riskData.overallRisk > 7 ? 'border-red-500/30 bg-red-500/5' : riskData.overallRisk > 4 ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-green-400/30 bg-green-400/5'}`}>
                                <div className="relative z-10">
                                    <h3 className="text-xs font-black text-textLight uppercase tracking-[0.3em] mb-4">Probability of Shortage</h3>
                                    <div className="flex items-baseline gap-4 mb-8">
                                        <span className="text-8xl font-black text-white tracking-tighter leading-none">{riskData.overallRisk}</span>
                                        <span className="text-2xl font-black text-textLight opacity-50 uppercase tracking-widest">/ 10 Score</span>
                                    </div>
                                    <p className="text-white font-black text-xl leading-tight uppercase tracking-tight">{riskData.overallRisk > 7 ? "CRITICAL: Attendance likely to drop below 75%." : riskData.overallRisk > 4 ? "MODERATE: Margin is shrinking. Be cautious." : "LOW RISK: High probability of survival."}</p>
                                    
                                    <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-white/5 text-center">
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-textLight tracking-widest mb-2">Subject Missed (Total)</p>
                                            <p className="text-4xl font-black text-white">{riskData.totalMissed}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-black text-textLight tracking-widest mb-2">Risk Impact Factor</p>
                                            <p className="text-4xl font-black text-white">{riskData.overallRisk * 10}%</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] px-2">Projected Status (Subject Wise)</h3>
                                <div className="glass-card p-8 space-y-6">
                                    {riskData.subjectRisks.map((risk: any, i: number) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-[11px] font-black text-white uppercase tracking-tight truncate max-w-[200px]">{risk.subject}</span>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${risk.riskScore > 7 ? 'text-red-400' : 'text-brand'}`}>
                                                    {risk.riskScore > 7 ? 'Risk Level: HIGH' : `${risk.riskScore} / 10`}
                                                </span>
                                            </div>
                                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${risk.riskScore * 10}%` }} className={`h-full ${risk.riskScore > 7 ? 'bg-red-500' : 'bg-brand'}`} />
                                            </div>
                                            <div className="flex justify-between">
                                                <p className="text-[9px] font-bold text-textLight uppercase tracking-tighter">Classes Needed: {risk.requiredAfterLeave > 0 ? risk.requiredAfterLeave : 0}</p>
                                                <p className="text-[9px] font-bold text-textLight uppercase tracking-tighter">Missed: {risk.missedInPeriod}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center glass-card p-16 border-dashed border-white/10 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
                            <ExclamationCircleIcon className="w-20 h-20 text-textLight/20 mb-6" />
                            <p className="text-sm font-black text-textLight uppercase tracking-[0.2em] text-center leading-relaxed">Enter travel dates to generate<br />risk index and survival map</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
      )}
    </div>
  );
}
