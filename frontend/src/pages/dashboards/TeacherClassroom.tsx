import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import {
  PlusIcon, UserGroupIcon, PencilSquareIcon, CheckIcon, XMarkIcon,
  ClipboardDocumentIcon, LinkIcon,
} from '@heroicons/react/24/outline';

interface Member { id: string; status: string; student: { name: string; registrationNumber: string } }
interface Board { id: string; title: string; isLive: boolean; shareToken: string; updatedAt: string }
interface Classroom { id: string; name: string; subject: string; inviteCode: string; members: Member[]; sketchBoards: Board[] }

export default function TeacherClassroom() {
  const { token } = useAuthStore();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', subject: '' });
  const [creating, setCreating] = useState(false);
  const [activeClassroom, setActiveClassroom] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchClassrooms = async () => {
    try {
      const res = await axios.get('/api/classroom/mine', { headers });
      setClassrooms(res.data.classrooms);
      if (res.data.classrooms.length > 0 && !activeClassroom) setActiveClassroom(res.data.classrooms[0].id);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchClassrooms(); }, [token]);

  const createClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post('/api/classroom', createForm, { headers });
      setShowCreate(false);
      setCreateForm({ name: '', subject: '' });
      await fetchClassrooms();
    } catch { } finally { setCreating(false); }
  };

  const handleMember = async (classroomId: string, memberId: string, status: 'APPROVED' | 'REJECTED') => {
    await axios.patch(`/api/classroom/${classroomId}/members/${memberId}`, { status }, { headers });
    await fetchClassrooms();
  };

  const createBoard = async (classroomId: string) => {
    const title = prompt('Board title:') || 'Untitled Board';
    const res = await axios.post(`/api/classroom/${classroomId}/boards`, { title }, { headers });
    await fetchClassrooms();
    // Open board in new tab
    window.open(`/board/${res.data.board.shareToken}`, '_blank');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const active = classrooms.find(c => c.id === activeClassroom);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">My Classrooms</h1>
          <p className="text-[10px] text-textLight/60 uppercase tracking-widest mt-1">Invite-only • Approve students • Live sketch boards</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-3 bg-brand text-background rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all">
          <PlusIcon className="w-4 h-4" /> New Classroom
        </button>
      </div>

      {classrooms.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 border border-dashed border-white/10 rounded-3xl text-center">
          <UserGroupIcon className="w-16 h-16 text-white/10" />
          <p className="text-xl font-black text-white uppercase">No classrooms yet</p>
          <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-brand text-background rounded-2xl font-black text-sm uppercase tracking-widest">Create First Classroom</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-2">
            {classrooms.map(c => (
              <button key={c.id} onClick={() => setActiveClassroom(c.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${activeClassroom === c.id ? 'bg-brand/10 border-brand/30 text-white' : 'bg-surface/20 border-white/5 text-textLight hover:border-white/15'}`}>
                <p className="font-black text-sm uppercase tracking-tight">{c.name}</p>
                <p className="text-[10px] uppercase tracking-widest mt-0.5 opacity-60">{c.subject}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] font-black bg-white/5 px-2 py-0.5 rounded-full">{c.members.filter(m => m.status === 'APPROVED').length} students</span>
                  {c.members.filter(m => m.status === 'PENDING').length > 0 && (
                    <span className="text-[9px] font-black bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full">{c.members.filter(m => m.status === 'PENDING').length} pending</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Main Panel */}
          {active && (
            <div className="space-y-6">
              {/* Invite Code */}
              <div className="p-5 bg-brand/5 border border-brand/20 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-textLight/60 uppercase tracking-widest">Invite Code</p>
                  <p className="text-3xl font-black text-brand tracking-widest mt-1">{active.inviteCode}</p>
                  <p className="text-[10px] text-textLight/50 mt-1">Share this code with students to join</p>
                </div>
                <button onClick={() => copyCode(active.inviteCode)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand/10 border border-brand/20 rounded-xl text-xs font-black text-brand hover:bg-brand/20 transition-all">
                  {copied === active.inviteCode ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                  {copied === active.inviteCode ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Pending Requests */}
              {active.members.filter(m => m.status === 'PENDING').length > 0 && (
                <div className="p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl space-y-3">
                  <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">Pending Join Requests</p>
                  {active.members.filter(m => m.status === 'PENDING').map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-background/50 rounded-xl">
                      <div>
                        <p className="text-sm font-black text-white">{m.student.name}</p>
                        <p className="text-[10px] text-textLight/60">{m.student.registrationNumber}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleMember(active.id, m.id, 'APPROVED')}
                          className="p-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 hover:bg-green-500/20 transition-all">
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleMember(active.id, m.id, 'REJECTED')}
                          className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 transition-all">
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Approved Members */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-white/60 uppercase tracking-widest">Students ({active.members.filter(m => m.status === 'APPROVED').length})</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {active.members.filter(m => m.status === 'APPROVED').map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-surface/20 border border-white/5 rounded-xl">
                      <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center text-brand font-black text-xs">
                        {m.student.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{m.student.name}</p>
                        <p className="text-[10px] text-textLight/50">{m.student.registrationNumber}</p>
                      </div>
                    </div>
                  ))}
                  {active.members.filter(m => m.status === 'APPROVED').length === 0 && (
                    <p className="text-textLight text-sm col-span-2 py-4 text-center">No approved students yet.</p>
                  )}
                </div>
              </div>

              {/* Sketch Boards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-white/60 uppercase tracking-widest">Sketch Boards</p>
                  <button onClick={() => createBoard(active.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 border border-brand/20 rounded-xl text-xs font-black text-brand hover:bg-brand/20 transition-all">
                    <PlusIcon className="w-3.5 h-3.5" /> New Board
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {active.sketchBoards.map(b => (
                    <div key={b.id} className="p-4 bg-surface/20 border border-white/5 rounded-2xl hover:border-white/15 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-black text-white">{b.title}</p>
                        {b.isLive && <span className="text-[9px] font-black bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />LIVE</span>}
                      </div>
                      <p className="text-[10px] text-textLight/50 mb-3">Updated {new Date(b.updatedAt).toLocaleDateString()}</p>
                      <a href={`/board/${b.shareToken}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs font-black text-brand hover:underline">
                        <LinkIcon className="w-3.5 h-3.5" /> Open Board
                      </a>
                    </div>
                  ))}
                  {active.sketchBoards.length === 0 && (
                    <p className="text-textLight text-sm col-span-2 py-4 text-center">No boards yet. Create one to share with students.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-surface border border-white/10 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white uppercase">Create Classroom</h2>
                <button onClick={() => setShowCreate(false)}><XMarkIcon className="w-5 h-5 text-textLight hover:text-white" /></button>
              </div>
              <form onSubmit={createClassroom} className="space-y-4">
                <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Classroom name (e.g. CSE-A1 Algorithms)" required
                  className="w-full bg-background border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-brand/50 outline-none" />
                <input value={createForm.subject} onChange={e => setCreateForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Subject (e.g. Design and Analysis of Algorithms)" required
                  className="w-full bg-background border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-brand/50 outline-none" />
                <button type="submit" disabled={creating}
                  className="w-full py-4 bg-brand text-background rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Classroom'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
