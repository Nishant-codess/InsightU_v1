import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  UsersIcon, 
  CalendarDaysIcon, 
  ChartBarIcon, 
  CloudArrowUpIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon,
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  LinkIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';

export default function AdminDashboard() {
  const { user, token } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stats, setStats] = useState({
      totalUsers: 0,
      activeSections: 0,
      activeTimetables: 0,
      activeBatches: [] as string[],
      systemHealth: 'Loading...'
  });

  const [activeTab, setActiveTab] = useState<'upload' | 'sync' | 'users' | 'parents' | 'approvals'>('upload');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [parentsList, setParentsList] = useState<any[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [linkRegInput, setLinkRegInput] = useState('');
  const [linkingParentId, setLinkingParentId] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [linkMessages, setLinkMessages] = useState<Record<string, string>>({});

  // Approval state
  const [pendingTeachers, setPendingTeachers] = useState<any[]>([]);
  const [pendingParents, setPendingParents] = useState<any[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  // Timetable Stats
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({ year: 2, batch: 'Batch 1' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Section Sync Stats
  const sectionSyncRef = useRef<HTMLInputElement>(null);
  const [sectionSyncFile, setSectionSyncFile] = useState<File | null>(null);
  const [sectionSyncStatus, setSectionSyncStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [selectedSection, setSelectedSection] = useState('A');

  // Calendar State
  const calendarInputRef = useRef<HTMLInputElement>(null);
  const [calendarFile, setCalendarFile] = useState<File | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [calendarInfo, setCalendarInfo] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchStats = async () => {
    try {
        const res = await axios.get('/api/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
    } catch (err) {
        console.error('Failed to fetch admin stats:', err);
    }
  };

  const fetchCalendarStatus = async () => {
    try {
        const res = await axios.get('/api/admin/calendar/status', {
            headers: { Authorization: `Bearer ${token}` }
        });
        // Use isSynced from backend or active flag
        setCalendarInfo(res.data);
    } catch (err) {
        console.error('Failed to fetch calendar status:', err);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCalendarStatus();

    if (activeTab === 'users') {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            try {
                const res = await axios.get('/api/admin/users', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsersList(res.data);
            } catch (err) {
                console.error('Failed to fetch users:', err);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }
    if (activeTab === 'parents') {
        const fetchParents = async () => {
            setLoadingParents(true);
            try {
                const res = await axios.get('/api/admin/parents', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setParentsList(res.data);
            } catch (err) {
                console.error('Failed to fetch parents:', err);
            } finally {
                setLoadingParents(false);
            }
        };
        fetchParents();
    }
    if (activeTab === 'approvals') {
        const fetchApprovals = async () => {
            setLoadingApprovals(true);
            try {
                const [teachersRes, parentsRes] = await Promise.all([
                    axios.get('/api/admin/pending-teachers', {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get('/api/admin/pending-parents', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                setPendingTeachers(teachersRes.data.teachers || []);
                setPendingParents(parentsRes.data.parents || []);
            } catch (err) {
                console.error('Failed to fetch pending approvals:', err);
            } finally {
                setLoadingApprovals(false);
            }
        };
        fetchApprovals();
    }
  }, [token, activeTab]);

  const statCards = [
      { label: 'Total Users', value: stats.totalUsers, icon: UsersIcon, color: 'text-blue-400', bg: 'bg-blue-400/10' },
      { label: 'Active Timetables', value: stats.activeTimetables, icon: CalendarDaysIcon, color: 'text-purple-400', bg: 'bg-purple-400/10' },
      { label: 'System Health', value: stats.systemHealth, icon: ChartBarIcon, color: 'text-green-400', bg: 'bg-green-400/10' }
  ];

  const handleUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedFile) return;

      setUploadStatus('uploading');
      
      const payload = new FormData();
      payload.append('file', selectedFile);
      payload.append('batch', formData.batch);

      try {
          await axios.post('/api/admin/timetable/upload', payload, {
              headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
          });
          setUploadStatus('success');
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          fetchStats();
          setTimeout(() => setUploadStatus('idle'), 3000);
      } catch (err: any) {
          setUploadStatus('error');
          setErrorMessage(err.response?.data?.error || 'Failed to process deterministic grid');
      }
  };

  const handleSectionSync = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!sectionSyncFile || !selectedSection) return;

      setSectionSyncStatus('uploading');
      const payload = new FormData();
      payload.append('file', sectionSyncFile);
      payload.append('section', selectedSection);

      try {
          await axios.post('/api/admin/section-sync', payload, {
              headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
          });
          setSectionSyncStatus('success');
          setSectionSyncFile(null);
          setTimeout(() => setSectionSyncStatus('idle'), 5000);
      } catch (err: any) {
          setSectionSyncStatus('error');
          setErrorMessage(err.response?.data?.error || 'Section sync failed');
      }
  };

  const handleCalendarUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!calendarFile) return;

      setCalendarStatus('uploading');
      setErrorMessage('');
      const payload = new FormData();
      payload.append('file', calendarFile);

      try {
          await axios.post('/api/admin/calendar/upload', payload, {
              headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
          });
          setCalendarStatus('success');
          setCalendarFile(null);
          fetchCalendarStatus();
          setTimeout(() => setCalendarStatus('idle'), 5000);
      } catch (err: any) {
          setCalendarStatus('error');
          setErrorMessage(err.response?.data?.error || 'Calendar sync failed. Check server logs.');
      }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Admin Control Center</h1>
            <p className="text-textLight mt-2 font-bold text-xs">LOGGED IN AS: {user?.email?.toUpperCase()}</p>
          </div>
          <div className="flex gap-2 p-1.5 bg-surface rounded-2xl border border-white/5 shadow-inner">
             <button 
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-brand text-background shadow-lg shadow-brand/20' : 'text-textLight hover:text-white'}`}
             >
                 Deterministic Sync
             </button>
             <button 
                onClick={() => setActiveTab('sync')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'sync' ? 'bg-brand text-background shadow-lg shadow-brand/20' : 'text-textLight hover:text-white'}`}
             >
                 Section Sync
             </button>
             <button 
                onClick={() => setActiveTab('approvals')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'approvals' ? 'bg-brand text-background shadow-lg shadow-brand/20' : 'text-textLight hover:text-white'}`}
             >
                 Approvals
             </button>
             <button 
                onClick={() => setActiveTab('users')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-brand text-background shadow-lg shadow-brand/20' : 'text-textLight hover:text-white'}`}
             >
                 User Management
             </button>
             <button 
                onClick={() => setActiveTab('parents')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'parents' ? 'bg-brand text-background shadow-lg shadow-brand/20' : 'text-textLight hover:text-white'}`}
             >
                 Parent Links
             </button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {statCards.map((stat, i) => (
             <motion.div 
               key={stat.label}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className="glass-card p-6 flex items-center gap-5 border-white/5 hover:border-brand/40 transition-all shadow-xl"
             >
                 <div className={`p-4 rounded-2xl ${stat.bg} shadow-inner shrink-0`}>
                     <stat.icon className={`w-8 h-8 ${stat.color}`} />
                 </div>
                 <div>
                     <p className="text-[10px] text-textLight font-black uppercase tracking-widest">{stat.label}</p>
                     <p className="text-3xl font-black text-white tracking-tighter">{stat.value}</p>
                 </div>
             </motion.div>
         ))}
      </div>

      {activeTab === 'upload' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Timetable Sync */}
            <motion.div 
             initial={{ opacity: 0, scale: 0.98 }}
             animate={{ opacity: 1, scale: 1 }}
             className="glass-card p-8 lg:col-span-8 flex flex-col space-y-8 border-brand/10 bg-brand/5 shadow-2xl"
            >
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Unified Timetable Loop</h2>
                    <p className="text-xs text-textLight font-medium">Upload the high-level Batch Timetable (The grid showing Slot IDs). This generates the base instruction for the entire cohort.</p>
                </div>
                
                <form onSubmit={handleUpload} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-textLight uppercase tracking-widest px-1">Cohort Batch</label>
                            <select 
                              className="w-full bg-surface border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-brand shadow-inner"
                              value={formData.batch}
                              onChange={(e) => setFormData({...formData, batch: e.target.value})}
                            >
                                <option>Batch 1</option>
                                <option>Batch 2</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-textLight uppercase tracking-widest px-1">Source Status</label>
                            <div className="flex items-center gap-3 p-4 bg-surface border border-white/5 rounded-2xl">
                                <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                                <span className="text-xs font-black text-brand uppercase">Deterministic Mode Active</span>
                            </div>
                        </div>
                    </div>

                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept=".pdf,image/*"
                      onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                    />

                    {stats.activeBatches?.includes(formData.batch) && uploadStatus !== 'uploading' && !selectedFile ? (
                        <div className="bg-brand/10 border border-brand/30 rounded-3xl p-12 text-center group transition-all hover:bg-brand/20">
                            <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 text-brand group-hover:scale-110 transition-transform shadow-glow shadow-brand/30" />
                            <p className="text-xl font-black text-brand uppercase tracking-tighter mb-2">ACTIVE FOR {formData.batch}</p>
                            <p className="text-sm font-medium text-brand/80 pb-6 uppercase tracking-widest">Deterministic mapping is online.</p>
                            
                            <Button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                variant="secondary" 
                                className="border-brand/30 text-brand bg-transparent hover:bg-brand/10 w-full rounded-2xl py-4 font-black uppercase text-xs"
                            >
                                Overwrite Sync PDF
                            </Button>
                        </div>
                    ) : (
                        <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer group ${selectedFile ? 'border-brand bg-brand/10' : 'border-white/10 hover:border-brand/40 bg-surface/50'}`}
                        >
                            <CloudArrowUpIcon className={`w-14 h-14 mx-auto mb-4 transition-transform group-hover:scale-110 ${selectedFile ? 'text-brand' : 'text-gray-500'}`} />
                            <p className="text-lg font-black text-white uppercase tracking-tighter">
                                {selectedFile ? selectedFile.name : 'Attach Unified Grid PDF'}
                            </p>
                            <p className="text-[10px] text-textLight mt-2 font-bold uppercase tracking-widest opacity-40 italic">Syncs Day Order Period &rarr; Slot Mapping for the Batch</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <p className="text-[10px] text-textLight uppercase font-black opacity-30">V3 Deterministic Sync Engine</p>
                        <Button 
                          type="submit" 
                          disabled={uploadStatus === 'uploading' || !selectedFile}
                          className="min-w-[180px] py-4 bg-brand text-background rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/20 active:scale-95 transition-all"
                        >
                           {uploadStatus === 'uploading' ? 'Syncing...' : 'Initiate Sync'}
                        </Button>
                    </div>

                    {uploadStatus === 'success' && (
                        <div className="bg-green-400/10 border border-green-400/20 p-6 rounded-2xl flex items-center gap-4">
                            <CheckCircleIcon className="w-8 h-8 text-green-400 shadow-glow shadow-green-400/50" />
                            <div>
                                <p className="text-sm text-green-400 font-black uppercase">Sync Complete!</p>
                                <p className="text-xs text-green-400/80 font-medium">Unified slots for {formData.batch} have been updated deterministically.</p>
                            </div>
                        </div>
                    )}
                </form>
            </motion.div>

            {/* Calendar Widget */}
            <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             className="glass-card p-8 lg:col-span-4 border-white/5 bg-surface/50 shadow-xl"
            >
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                        <CalendarDaysIcon className="w-6 h-6 text-brand" />
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Academic Calendar</h2>
                    </div>
                </div>
                
                {calendarInfo?.isSynced ? (
                    <div className="space-y-8">
                        <div className="bg-background rounded-3xl p-8 border border-white/5 text-center relative overflow-hidden group shadow-inner">
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                                <span className="text-[8px] font-black text-brand tracking-widest uppercase">Live Sync</span>
                            </div>
                            <p className="text-[10px] font-black text-textLight uppercase tracking-widest mb-6 opacity-50">Current Day Order</p>
                            <h3 className="text-6xl font-black text-white tracking-tighter mb-4 text-glow transition-transform group-hover:scale-110 duration-700">
                                {calendarInfo.currentDayOrder || 'H'}
                            </h3>
                            <p className="text-xs text-textLight font-bold uppercase tracking-[0.2em]">{calendarInfo.dayName}</p>
                        </div>

                        <div className="text-center font-mono space-y-1">
                            <p className="text-2xl font-black text-white">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                            <p className="text-[10px] text-textLight font-black uppercase tracking-widest opacity-50">Local System Time</p>
                        </div>

                        <form onSubmit={handleCalendarUpload} className="space-y-4">
                             <input type="file" ref={calendarInputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => e.target.files && setCalendarFile(e.target.files[0])} />
                             <Button onClick={() => calendarInputRef.current?.click()} type="button" variant="secondary" className="w-full py-4 border-white/10 hover:border-brand/40 text-xs font-black uppercase tracking-widest">
                                {calendarFile ? calendarFile.name : 'Update Jan-Jun PDF'}
                             </Button>
                             {calendarFile && (
                                <Button type="submit" disabled={calendarStatus === 'uploading'} className="w-full py-4 bg-brand text-background">
                                   {calendarStatus === 'uploading' ? 'Syncing...' : 'Sync Now'}
                                </Button>
                             )}
                             {!calendarFile && (
                                <button 
                                    type="button"
                                    onClick={fetchCalendarStatus}
                                    className="text-[10px] text-brand font-black uppercase tracking-widest w-full hover:underline opacity-60 flex items-center justify-center gap-2"
                                >
                                    <AdjustmentsHorizontalIcon className="w-3 h-3" />
                                    Refresh Sync Status
                                </button>
                             )}
                        </form>
                    </div>
                ) : (
                    <form onSubmit={handleCalendarUpload} className="space-y-6">
                        <div className="p-8 border-2 border-dashed border-white/10 rounded-3xl text-center space-y-4">
                            <CalendarDaysIcon className="w-12 h-12 text-white/5 mx-auto" />
                            <p className="text-sm text-textLight font-bold uppercase tracking-widest opacity-50 italic">
                                {calendarStatus === 'error' ? 'Sync failed — please retry' : 'Calendar not synced yet'}
                            </p>
                            {errorMessage && <p className="text-[10px] text-red-400 font-bold uppercase">{errorMessage}</p>}
                        </div>
                        <input type="file" ref={calendarInputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => e.target.files && setCalendarFile(e.target.files[0])} />
                        <Button 
                            onClick={() => calendarInputRef.current?.click()} 
                            type="button" 
                            disabled={calendarStatus === 'uploading'}
                            className="w-full py-5 rounded-2xl bg-brand text-background font-black text-xs uppercase tracking-widest shadow-lg shadow-brand/20"
                        >
                            {calendarFile ? calendarFile.name : calendarStatus === 'error' ? 'Retry Sync' : 'Upload Master Calendar'}
                        </Button>
                        {calendarFile && (
                            <Button type="submit" disabled={calendarStatus === 'uploading'} className="w-full py-4 bg-background border border-brand text-brand">
                                {calendarStatus === 'uploading' ? 'Processing...' : 'Sync Day Order Mapping'}
                            </Button>
                        )}
                        {!calendarFile && calendarStatus === 'error' && (
                             <button 
                                type="button"
                                onClick={() => { setCalendarStatus('idle'); fetchCalendarStatus(); }}
                                className="text-[10px] text-textLight font-black uppercase tracking-widest w-full hover:underline opacity-40"
                            >
                                Clear Error
                            </button>
                        )}
                    </form>
                )}

                {/* Debug Info */}
                <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-textLight opacity-40">
                        <span>Engine Status</span>
                        <span className={calendarInfo?.isSynced ? "text-brand" : "text-yellow-500"}>
                            {calendarInfo?.isSynced ? "Deterministic Active" : "Waiting for Sync"}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-textLight opacity-40">
                        <span>Current Day Order</span>
                        <span className="text-white">{calendarInfo?.currentDayOrder || "Not Synced"}</span>
                    </div>
                </div>
            </motion.div>
        </div>
      ) : activeTab === 'sync' ? (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 border-brand/20 bg-brand/5 shadow-2xl relative overflow-hidden"
        >
            <AdjustmentsHorizontalIcon className="absolute -right-20 -bottom-20 w-80 h-80 text-brand/5 rotate-12" />
            <div className="relative z-10 max-w-4xl">
                <div className="flex items-center gap-5 mb-10">
                    <div className="p-4 bg-brand rounded-2xl shadow-xl shadow-brand/20"><AcademicCapIcon className="w-8 h-8 text-background" /></div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Personalized Section Sync</h2>
                        <p className="text-[10px] text-textLight uppercase font-black tracking-widest mt-1">One-to-Many Deterministic Deployment</p>
                    </div>
                </div>

                <p className="text-sm text-textLight font-medium mb-12 leading-relaxed">
                    Industrial efficiency mode. Upload <span className="text-white font-bold">one student's "My Attendance" PDF</span> and the system will instantly map symbols to subjects/rooms for <span className="text-brand font-bold underline">every student in the chosen section</span>.
                </p>

                <form onSubmit={handleSectionSync} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-textLight uppercase tracking-widest px-2 flex items-center gap-2">
                                <div className="w-1 h-1 bg-brand rounded-full" /> Target Section
                            </label>
                            <input 
                                type="text"
                                className="w-full bg-surface border border-white/10 rounded-2xl p-5 text-white font-black uppercase tracking-widest outline-none focus:border-brand shadow-inner"
                                placeholder="E.g. A, B, C..."
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value.toUpperCase())}
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-textLight uppercase tracking-widest px-2 flex items-center gap-2">
                                <div className="w-1 h-1 bg-brand rounded-full" /> Template Document
                            </label>
                            <input type="file" ref={sectionSyncRef} className="hidden" accept=".pdf,image/*" onChange={(e) => e.target.files && setSectionSyncFile(e.target.files[0])} />
                            <div 
                                onClick={() => sectionSyncRef.current?.click()}
                                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer group ${sectionSyncFile ? 'border-brand bg-brand/20' : 'border-white/10 hover:border-brand/40 bg-surface/30'}`}
                            >
                                <CloudArrowUpIcon className="w-10 h-10 mx-auto text-brand mb-3 group-hover:scale-110 transition-transform" />
                                <p className="text-xs font-black text-white uppercase tracking-widest truncate max-w-full">
                                    {sectionSyncFile ? sectionSyncFile.name : 'Attach Reference PDF'}
                                </p>
                            </div>
                        </div>

                        <Button 
                            type="submit"
                            disabled={sectionSyncStatus === 'uploading' || !sectionSyncFile || !selectedSection}
                            className="w-full py-6 bg-brand text-background rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-brand/40 hover:scale-[1.01] active:scale-100 transition-all disabled:opacity-50"
                        >
                            {sectionSyncStatus === 'uploading' ? 'Deploying Sync...' : 'Sync Entire Section'}
                        </Button>
                    </div>

                    <div className="bg-surface/50 border border-white/5 rounded-3xl p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <ExclamationCircleIcon className="w-6 h-6 text-brand" />
                            <h4 className="text-xs font-black text-white uppercase tracking-widest">Deployment Rules</h4>
                        </div>
                        <ul className="space-y-4">
                            <li className="flex gap-3 text-[11px] text-textLight">
                                <div className="w-1.5 h-1.5 bg-brand rounded-full mt-1 shrink-0" />
                                <span>Overrides ALL existing mappings for the target section.</span>
                            </li>
                            <li className="flex gap-3 text-[11px] text-textLight">
                                <div className="w-1.5 h-1.5 bg-brand rounded-full mt-1 shrink-0" />
                                <span>Uses the <span className="text-white font-bold">Regex Parser</span> to identify subjects and rooms.</span>
                            </li>
                            <li className="flex gap-3 text-[11px] text-textLight">
                                <div className="w-1.5 h-1.5 bg-brand rounded-full mt-1 shrink-0" />
                                <span>Forces immediate cache invalidation for all affected students.</span>
                            </li>
                        </ul>
                    </div>
                </form>

                {sectionSyncStatus === 'success' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10 bg-green-400/10 border border-green-400/20 p-6 rounded-2xl flex items-center gap-5">
                        <CheckCircleIcon className="w-10 h-10 text-green-400" />
                        <div>
                            <p className="text-md text-green-400 font-black uppercase">Cohort Sync Successful</p>
                            <p className="text-xs text-green-400/70 font-medium">Successfully pushed deterministic mappings to all students in Section {selectedSection}.</p>
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
      ) : activeTab === 'approvals' ? (
        <div className="space-y-8">
          {/* Pending Teachers */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 border-white/5"
          >
            <div className="flex items-center gap-3 mb-6">
              <AcademicCapIcon className="w-6 h-6 text-brand" />
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Pending Teacher Approvals</h2>
            </div>
            
            {loadingApprovals ? (
              <div className="text-center py-20 text-textLight animate-pulse font-black uppercase tracking-widest text-xs">Loading Approvals...</div>
            ) : pendingTeachers.length === 0 ? (
              <div className="text-center py-12 text-textLight text-sm">No pending teacher approvals</div>
            ) : (
              <div className="space-y-4">
                {pendingTeachers.map((teacher: any) => (
                  <div key={teacher.id} className="p-6 bg-surface/50 border border-white/5 rounded-2xl space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-white font-black uppercase tracking-tight text-lg">{teacher.name}</p>
                        <p className="text-xs text-textLight mt-1">{teacher.user?.email}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold">
                            {teacher.department}
                          </span>
                          {teacher.subjects?.map((subject: string) => (
                            <span key={subject} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                              {subject}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {teacher.idCardUrl && (
                          <a 
                            href={teacher.idCardUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-all text-center"
                          >
                            View ID Card
                          </a>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await axios.post(`/api/admin/approve-teacher/${teacher.id}`, 
                                  { adminUserId: user?.id },
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                setPendingTeachers(prev => prev.filter(t => t.id !== teacher.id));
                              } catch (err) {
                                console.error('Approval failed:', err);
                              }
                            }}
                            className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl text-xs font-black hover:bg-green-500/30 transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              const reason = prompt('Rejection reason (optional):');
                              try {
                                await axios.post(`/api/admin/reject-teacher/${teacher.id}`, 
                                  { reason },
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                setPendingTeachers(prev => prev.filter(t => t.id !== teacher.id));
                              } catch (err) {
                                console.error('Rejection failed:', err);
                              }
                            }}
                            className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-black hover:bg-red-500/30 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Pending Parents */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 border-white/5"
          >
            <div className="flex items-center gap-3 mb-6">
              <UsersIcon className="w-6 h-6 text-brand" />
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Pending Parent Approvals</h2>
            </div>
            
            {loadingApprovals ? (
              <div className="text-center py-20 text-textLight animate-pulse font-black uppercase tracking-widest text-xs">Loading Approvals...</div>
            ) : pendingParents.length === 0 ? (
              <div className="text-center py-12 text-textLight text-sm">No pending parent approvals</div>
            ) : (
              <div className="space-y-4">
                {pendingParents.map((parent: any) => (
                  <div key={parent.id} className="p-6 bg-surface/50 border border-white/5 rounded-2xl space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-white font-black uppercase tracking-tight text-lg">{parent.name}</p>
                        <p className="text-xs text-textLight mt-1">{parent.user?.email}</p>
                        {parent.phone && (
                          <p className="text-xs text-textLight mt-1">Phone: {parent.phone}</p>
                        )}
                        <div className="mt-3 p-3 bg-brand/10 border border-brand/20 rounded-xl">
                          <p className="text-xs text-brand font-bold mb-1">Child's SRM Email:</p>
                          <p className="text-sm text-white font-mono">{parent.childSrmEmail}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {parent.childIdCardUrl && (
                          <a 
                            href={parent.childIdCardUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-all text-center"
                          >
                            View Child's ID Card
                          </a>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await axios.post(`/api/admin/approve-parent/${parent.id}`, 
                                  { adminUserId: user?.id },
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                setPendingParents(prev => prev.filter(p => p.id !== parent.id));
                              } catch (err) {
                                console.error('Approval failed:', err);
                              }
                            }}
                            className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl text-xs font-black hover:bg-green-500/30 transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              const reason = prompt('Rejection reason (optional):');
                              try {
                                await axios.post(`/api/admin/reject-parent/${parent.id}`, 
                                  { reason },
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                setPendingParents(prev => prev.filter(p => p.id !== parent.id));
                              } catch (err) {
                                console.error('Rejection failed:', err);
                              }
                            }}
                            className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-black hover:bg-red-500/30 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="glass-card p-8 border-white/5">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">User Records</h2>
            {loadingUsers ? (
                <div className="text-center py-20 text-textLight animate-pulse font-black uppercase tracking-widest text-xs">Accessing Core Records...</div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/5">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface/50 border-b border-white/10 uppercase">
                                <th className="px-6 py-4 text-[10px] font-black text-textLight tracking-widest">User Entity</th>
                                <th className="px-6 py-4 text-[10px] font-black text-textLight tracking-widest">System Role</th>
                                <th className="px-6 py-4 text-[10px] font-black text-textLight tracking-widest">Section Focus</th>
                                <th className="px-6 py-4 text-[10px] font-black text-textLight tracking-widest">Last Activity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersList.map((usr) => (
                                <tr key={usr.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-black text-white group-hover:text-brand transition-colors uppercase leading-none mb-1">{usr.email.split('@')[0]}</p>
                                        <p className="text-[10px] text-textLight opacity-50">{usr.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${usr.role === 'ADMIN' ? 'bg-brand/20 text-brand' : usr.role === 'TEACHER' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {usr.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-white opacity-70">{usr.student?.section || usr.teacher?.department || 'SYSTEM'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-[10px] text-textLight font-black uppercase">{new Date(usr.createdAt).toLocaleDateString()}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      ) : null}

      {activeTab === 'parents' && (
        <div className="glass-card p-8 border-white/5 space-y-6">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <LinkIcon className="w-6 h-6 text-brand" /> Parent–Student Links
          </h2>
          {loadingParents ? (
            <div className="text-center py-20 text-textLight animate-pulse font-black uppercase tracking-widest text-xs">Loading Parent Records...</div>
          ) : parentsList.length === 0 ? (
            <div className="text-center py-20 text-textLight text-sm">No parent accounts found.</div>
          ) : (
            <div className="space-y-4">
              {parentsList.map((parent: any) => (
                <div key={parent.id} className="p-5 bg-surface/50 border border-white/5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-black uppercase tracking-tight">{parent.name}</p>
                      <p className="text-[10px] text-textLight opacity-60">{parent.user?.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {linkingParentId === parent.id ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setLinkStatus(s => ({ ...s, [parent.id]: 'loading' }));
                            try {
                              await axios.post(`/api/admin/parents/${parent.id}/link-student`,
                                { registrationNumber: linkRegInput.trim() },
                                { headers: { Authorization: `Bearer ${token}` } }
                              );
                              setLinkStatus(s => ({ ...s, [parent.id]: 'success' }));
                              setLinkMessages(m => ({ ...m, [parent.id]: 'Linked!' }));
                              setLinkRegInput('');
                              setLinkingParentId(null);
                              // Refresh
                              setLoadingParents(true);
                              const res = await axios.get('/api/admin/parents', { headers: { Authorization: `Bearer ${token}` } });
                              setParentsList(res.data);
                              setLoadingParents(false);
                            } catch (err: any) {
                              setLinkStatus(s => ({ ...s, [parent.id]: 'error' }));
                              setLinkMessages(m => ({ ...m, [parent.id]: err.response?.data?.error || 'Failed' }));
                            }
                          }}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            value={linkRegInput}
                            onChange={e => setLinkRegInput(e.target.value)}
                            placeholder="Student Reg Number"
                            className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-brand w-52"
                            autoFocus
                          />
                          <button type="submit" disabled={linkStatus[parent.id] === 'loading'} className="px-3 py-2 bg-brand text-background rounded-xl text-xs font-black">
                            {linkStatus[parent.id] === 'loading' ? '...' : 'Link'}
                          </button>
                          <button type="button" onClick={() => { setLinkingParentId(null); setLinkRegInput(''); }} className="px-3 py-2 bg-surface border border-white/10 rounded-xl text-xs text-textLight">
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => { setLinkingParentId(parent.id); setLinkRegInput(''); setLinkStatus(s => ({ ...s, [parent.id]: 'idle' })); setLinkMessages(m => ({ ...m, [parent.id]: '' })); }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-brand/10 border border-brand/30 text-brand rounded-xl text-xs font-black hover:bg-brand/20 transition-all"
                        >
                          <LinkIcon className="w-3.5 h-3.5" /> Link Student
                        </button>
                      )}
                    </div>
                  </div>
                  {linkMessages[parent.id] && (
                    <p className={`text-xs font-bold ${linkStatus[parent.id] === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                      {linkMessages[parent.id]}
                    </p>
                  )}
                  {/* Linked Students */}
                  {parent.linkedStudents?.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] text-textLight uppercase tracking-widest font-black">Linked Students</p>
                      <div className="flex flex-wrap gap-2">
                        {parent.linkedStudents.map((ps: any) => (
                          <div key={ps.student.id} className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 border border-brand/20 rounded-lg">
                            <AcademicCapIcon className="w-3.5 h-3.5 text-brand" />
                            <span className="text-xs text-white font-bold">{ps.student.name}</span>
                            <span className="text-[10px] text-textLight font-mono">{ps.student.registrationNumber}</span>
                            <button
                              onClick={async () => {
                                try {
                                  await axios.delete(`/api/admin/parents/${parent.id}/unlink-student/${ps.student.id}`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  const res = await axios.get('/api/admin/parents', { headers: { Authorization: `Bearer ${token}` } });
                                  setParentsList(res.data);
                                } catch (err) {
                                  console.error('Unlink failed', err);
                                }
                              }}
                              className="ml-1 text-red-400 hover:text-red-300 transition-colors"
                              title="Unlink student"
                            >
                              <XMarkIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-textLight italic">No students linked yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Advisory */}
      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="glass-card p-6 border-brand/20 bg-brand/5 shadow-inner"
      >
          <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-4 bg-brand/10 border border-brand/30 rounded-2xl">
                   <AcademicCapIcon className="w-8 h-8 text-brand" />
              </div>
              <div className="flex-1 text-center md:text-left">
                  <h4 className="text-sm font-black text-white uppercase tracking-tighter mb-1">Deterministic Architecture Note</h4>
                  <p className="text-xs text-textLight font-medium">The system now operates on a zero-OCR baseline. Admins upload the structure (Calendar + Unified Grid), and students provide the content (Subjects + Rooms). This eliminates extraction &quot;hallucinations&quot; entirely.</p>
              </div>
          </div>
      </motion.div>
    </div>
  );
}
