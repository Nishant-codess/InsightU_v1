import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import {
  ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon,
  LockClosedIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

interface AttendanceRecord { subject: string; attended: number; total: number; percentage: number; }
interface MarksAssessment { name: string; scored: number; max: number; percentage: number; }
interface MarksRecord { subject: string; assessments: MarksAssessment[]; overall: number; }

export default function StudentPortalData() {
  const { token } = useAuthStore();
  const [data, setData] = useState<{ synced: boolean; syncedAt?: string; attendance: AttendanceRecord[]; marks: MarksRecord[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'marks'>('attendance');

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/student/portal/data', { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
    } catch { setData({ synced: false, attendance: [], marks: [] }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {showSyncModal && <SyncModal token={token!} onClose={() => setShowSyncModal(false)} onSuccess={() => { setShowSyncModal(false); fetchData(); }} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Academic Data</h1>
          <p className="text-[10px] text-textLight/60 uppercase tracking-widest mt-1">
            {data?.synced ? `Last synced: ${new Date(data.syncedAt!).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}` : 'Not synced yet'}
          </p>
        </div>
        <button onClick={() => setShowSyncModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-brand text-background rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all">
          <ArrowPathIcon className="w-4 h-4" />
          {data?.synced ? 'Re-sync from SRM' : 'Sync from SRM Portal'}
        </button>
      </div>

      {!data?.synced ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-6 py-20 text-center border border-dashed border-white/10 rounded-3xl">
          <LockClosedIcon className="w-16 h-16 text-white/10" />
          <div>
            <p className="text-xl font-black text-white uppercase">No data synced yet</p>
            <p className="text-sm text-textLight mt-2">Enter your SRM portal credentials to import attendance and marks.</p>
          </div>
          <button onClick={() => setShowSyncModal(true)}
            className="px-8 py-4 bg-brand text-background rounded-2xl font-black text-sm uppercase tracking-widest">
            Sync Now
          </button>
        </motion.div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-surface/50 border border-white/5 w-fit rounded-2xl">
            {(['attendance', 'marks'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand text-background' : 'text-textLight hover:text-white'}`}>
                {tab === 'attendance' ? '📊 Attendance' : '📝 Marks'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'attendance' ? (
              <motion.div key="att" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.attendance.length === 0 ? (
                  <p className="text-textLight col-span-2 text-center py-10">No attendance data found.</p>
                ) : data.attendance.map((rec, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="p-5 bg-surface/30 border border-white/5 rounded-2xl space-y-3 hover:border-white/15 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-black text-white leading-tight">{rec.subject}</p>
                      <span className={`text-xs font-black px-2 py-1 rounded-lg shrink-0 ${rec.percentage >= 75 ? 'bg-green-500/10 text-green-400' : rec.percentage >= 65 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                        {rec.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${rec.percentage >= 75 ? 'bg-green-400' : rec.percentage >= 65 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(rec.percentage, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-textLight/60 uppercase tracking-widest">{rec.attended} / {rec.total} classes</p>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="marks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-4">
                {data.marks.length === 0 ? (
                  <p className="text-textLight text-center py-10">No marks data found.</p>
                ) : data.marks.map((rec, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="p-5 bg-surface/30 border border-white/5 rounded-2xl hover:border-white/15 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-black text-white">{rec.subject}</p>
                      <span className={`text-xs font-black px-2 py-1 rounded-lg ${rec.overall >= 75 ? 'bg-green-500/10 text-green-400' : rec.overall >= 50 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                        Avg {rec.overall}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {rec.assessments.map((a, j) => (
                        <div key={j} className="p-3 bg-background/50 rounded-xl text-center">
                          <p className="text-[9px] text-textLight/60 uppercase tracking-widest mb-1">{a.name}</p>
                          <p className="text-lg font-black text-white">{a.scored}<span className="text-xs text-textLight">/{a.max}</span></p>
                          <p className="text-[10px] text-brand font-black">{a.percentage}%</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function SyncModal({ token, onClose, onSuccess }: { token: string; onClose: () => void; onSuccess: () => void }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMsg('');
    try {
      const res = await axios.post('/api/student/portal/sync-all', { loginId, password }, { headers: { Authorization: `Bearer ${token}` } });
      setStatus('success');
      setMsg(res.data.message);
      setTimeout(onSuccess, 1500);
    } catch (err: any) {
      setStatus('error');
      setMsg(err.response?.data?.error || 'Sync failed. Check credentials.');
    } finally { setLoginId(''); setPassword(''); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-surface border border-white/10 rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white uppercase">Sync from SRM Portal</h2>
          <button onClick={onClose}><XMarkIcon className="w-5 h-5 text-textLight hover:text-white" /></button>
        </div>
        <p className="text-xs text-textLight bg-brand/5 border border-brand/15 rounded-xl p-3">
          Imports your <span className="text-brand font-black">timetable, attendance %</span> and <span className="text-brand font-black">marks</span> in one go. Credentials are never stored.
        </p>
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircleIcon className="w-12 h-12 text-green-400" />
            <p className="text-sm font-black text-white">{msg}</p>
          </div>
        ) : (
          <form onSubmit={handleSync} className="space-y-4">
            <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="SRM Email (e.g. nr0070@srmist.edu.in)"
              required className="w-full bg-background border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-brand/50 outline-none" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="SRM Portal Password"
              required className="w-full bg-background border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-brand/50 outline-none" />
            {status === 'error' && (
              <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <ExclamationCircleIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{msg}</p>
              </div>
            )}
            <button type="submit" disabled={status === 'loading' || !loginId || !password}
              className="w-full py-4 bg-brand text-background rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
              {status === 'loading' ? <><span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />Syncing (30-60s)...</> : 'Import Everything'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
