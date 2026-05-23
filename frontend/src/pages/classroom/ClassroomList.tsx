import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { PlusIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const API = import.meta.env.VITE_API_URL ?? '';

interface Classroom {
  id: string;
  name: string;
  subject: string;
  description?: string;
  inviteCode: string;
  createdAt: string;
  _count?: {
    members: number;
    posts: number;
  };
  teacher?: {
    name: string;
  };
}

export default function ClassroomList() {
  const { token, user } = useAuthStore();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const endpoint = isTeacher ? '/api/classroom/teacher' : '/api/classroom/student/classrooms';
      const res = await fetch(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setClassrooms(data.classrooms || []);
    } catch (error) {
      console.error('Failed to fetch classrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Classrooms</h1>
            <p className="text-gray-300">
              {isTeacher ? 'Manage your classrooms' : 'Your enrolled classrooms'}
            </p>
          </div>
          <div className="flex gap-3">
            {isTeacher ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition"
              >
                <PlusIcon className="w-5 h-5" />
                Create Classroom
              </button>
            ) : (
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition"
              >
                <PlusIcon className="w-5 h-5" />
                Join Classroom
              </button>
            )}
          </div>
        </div>

        {/* Classrooms Grid */}
        {classrooms.length === 0 ? (
          <div className="text-center py-20">
            <UserGroupIcon className="w-20 h-20 text-gray-500 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-white mb-2">No classrooms yet</h3>
            <p className="text-gray-400 mb-6">
              {isTeacher ? 'Create your first classroom to get started' : 'Join a classroom to see it here'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((classroom) => (
              <div
                key={classroom.id}
                onClick={() => (window.location.href = `/classroom/${classroom.id}`)}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/20 transition cursor-pointer border border-white/10"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{classroom.name}</h3>
                    <p className="text-purple-300 text-sm">{classroom.subject}</p>
                  </div>
                  {isTeacher && (
                    <div className="bg-purple-600/30 px-3 py-1 rounded-lg">
                      <p className="text-xs text-purple-200 font-mono">{classroom.inviteCode}</p>
                    </div>
                  )}
                </div>

                {classroom.description && (
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">{classroom.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <UserGroupIcon className="w-4 h-4" />
                    <span>{classroom._count?.members || 0} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>{classroom._count?.posts || 0} posts</span>
                  </div>
                </div>

                {!isTeacher && classroom.teacher && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-400">Teacher: {classroom.teacher.name}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateClassroomModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchClassrooms();
          }}
        />
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <JoinClassroomModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            setShowJoinModal(false);
            fetchClassrooms();
          }}
        />
      )}
    </div>
  );
}

function CreateClassroomModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuthStore();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/api/classroom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, subject, description }),
      });

      if (!res.ok) throw new Error('Failed to create classroom');

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-4">Create Classroom</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Classroom Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Data Structures"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Computer Science"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Brief description..."
              rows={3}
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinClassroomModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuthStore();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/api/classroom/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to join classroom');

      setSuccess('Join request sent! Waiting for teacher approval.');
      setTimeout(() => onSuccess(), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-4">Join Classroom</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-center text-lg tracking-wider"
              placeholder="A3F9B2C1"
              maxLength={8}
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
