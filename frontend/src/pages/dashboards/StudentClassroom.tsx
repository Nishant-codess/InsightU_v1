import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { PlusIcon, LinkIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface Board { id: string; title: string; shareToken: string }
interface Classroom { id: string; name: string; subject: string; teacher: { name: string }; sketchBoards: Board[] }
interface Membership { id: string; status: string; classroom: Classroom }

export default function StudentClassroom() {
  const { token } = useAuthStore();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchMemberships = async () => {
    try {
      const res = await axios.get('/api/classroom/student/mine', { headers });
      setMemberships(res.data.memberships);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchMemberships(); }, [token]);

  const joinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoining(true);
    setJoinMsg(null);
    try {
      const res = await axios.post('/api/classroom/join', { inviteCode }, { headers });
      setJoinMsg({ type: 'success', text: res.data.message });
      setInviteCode('');
      await fetchMemberships();
    } catch (err: any) {
      setJoinMsg({ type: 'error', text: err.response?.data?.error || 'Failed to join' });
    } finally { setJoining(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">My Classrooms</h1>
        <p className="text-[10px] text-textLight/60 uppercase tracking-widest mt-1">Join with invite code · View live sketch boards</p>
      </div>

      {/* Join Form */}
      <form onSubmit={joinClassroom} className="flex gap-3">
        <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
          placeholder="Enter invite code (e.g. A3F9B2C1)"
          className="flex-1 bg-surface/30 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-mono uppercase tracking-widest focus:border-brand/50 outline-none" />
        <button type="submit" disabled={joining || !inviteCode.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-brand text-background rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:brightness-110 transition-all">
          <PlusIcon className="w-4 h-4" />
          {joining ? 'Joining...' : 'Join'}
        </button>
      </form>

      {joinMsg && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 p-3 rounded-xl text-sm font-black ${joinMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {joinMsg.type === 'success' ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
          {joinMsg.text}
        </motion.div>
      )}

      {/* Memberships */}
      {memberships.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 border border-dashed border-white/10 rounded-3xl text-center">
          <p className="text-xl font-black text-white uppercase">No classrooms joined yet</p>
          <p className="text-sm text-textLight">Ask your teacher for an invite code</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberships.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`p-5 rounded-2xl border transition-all ${m.status === 'APPROVED' ? 'bg-surface/30 border-white/10 hover:border-white/20' : m.status === 'PENDING' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-red-500/5 border-red-500/20 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-black text-white text-sm uppercase tracking-tight">{m.classroom.name}</p>
                  <p className="text-[10px] text-textLight/60 uppercase tracking-widest mt-0.5">{m.classroom.subject}</p>
                  <p className="text-[10px] text-textLight/40 mt-0.5">by {m.classroom.teacher.name}</p>
                </div>
                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${m.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' : m.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                  {m.status === 'PENDING' ? '⏳ Pending' : m.status === 'APPROVED' ? '✓ Joined' : '✗ Rejected'}
                </span>
              </div>

              {m.status === 'APPROVED' && m.classroom.sketchBoards.length > 0 && (
                <div className="space-y-2 mt-3 pt-3 border-t border-white/5">
                  <p className="text-[9px] text-textLight/50 uppercase tracking-widest">Live Boards</p>
                  {m.classroom.sketchBoards.map(b => (
                    <a key={b.id} href={`/board/${b.shareToken}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-xs font-black text-brand hover:underline">
                      <LinkIcon className="w-3.5 h-3.5" />
                      {b.title}
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    </a>
                  ))}
                </div>
              )}

              {m.status === 'PENDING' && (
                <div className="flex items-center gap-2 mt-3 text-[10px] text-yellow-400/70">
                  <ClockIcon className="w-3.5 h-3.5" />
                  Waiting for teacher approval
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
