import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { VideoCameraIcon, PlayIcon, UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export default function LiveSessionsPage() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'TEACHER';
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('Live Lecture');

  const fetchActiveSession = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/sessions/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data);
      }
    } catch (err) {
      console.error('Failed to fetch active session:', err);
    }
  };

  useEffect(() => {
    fetchActiveSession();
    const interval = setInterval(fetchActiveSession, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [token]);

  const handleStartSession = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to start session');
      const data = await res.json();
      navigate(`/live-class/${data.session_id || data.id}`);
    } catch (err) {
      console.error('Failed to start session:', err);
      alert('Failed to start session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async () => {
    if (!activeSession || !token) return;
    setLoading(true);
    try {
      await fetch(`${API}/sessions/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: activeSession.session_id || activeSession.id }),
      });
      navigate(`/live-class/${activeSession.session_id || activeSession.id}`);
    } catch (err) {
      console.error('Failed to join session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession || !token) return;
    if (!window.confirm('End this live session?')) return;
    try {
      await fetch(`${API}/sessions/${activeSession.session_id || activeSession.id}/end`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveSession(null);
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <VideoCameraIcon className="w-7 h-7 text-purple-300" />
          Live Sessions
        </h1>
        <p className="text-gray-400 mt-1">
          {isTeacher ? 'Start or manage your live teaching sessions.' : 'Join an active live session from your teacher.'}
        </p>
      </div>

      {/* Active Session Card */}
      {activeSession && (
        <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/30 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-bold text-green-400 uppercase tracking-widest">LIVE NOW</span>
              </div>
              <h2 className="text-xl font-bold text-white">{activeSession.title}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {isTeacher
                  ? 'Your session is currently active.'
                  : `Started by ${activeSession.teacher_name || 'your teacher'}`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {isTeacher ? (
                <>
                  <button
                    onClick={() => navigate(`/live-class/${activeSession.session_id || activeSession.id}`)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-sm transition flex items-center gap-2"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Rejoin Session
                  </button>
                  <button
                    onClick={handleEndSession}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-300 rounded-xl font-semibold text-sm transition"
                  >
                    End Session
                  </button>
                </>
              ) : (
                <button
                  onClick={handleJoinSession}
                  disabled={loading}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition flex items-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UserGroupIcon className="w-4 h-4" />
                  )}
                  Join Session
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Teacher: Start New Session */}
      {isTeacher && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Start New Session</h2>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Session Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Database Management Lecture 4"
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition"
            />
          </div>
          <button
            onClick={handleStartSession}
            disabled={loading || !title}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PlusIcon className="w-4 h-4" />
            )}
            Start Live Session
          </button>
        </div>
      )}

      {/* Student: No session state */}
      {!isTeacher && !activeSession && (
        <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-12 text-center">
          <VideoCameraIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Active Session</h3>
          <p className="text-gray-400 text-sm">
            There's no live session active right now. Check back when your teacher starts one.
          </p>
          <button
            onClick={fetchActiveSession}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-sm transition"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
