import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { UsersIcon, BookOpenIcon, BoltIcon, DocumentTextIcon, XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';

interface UploadedNote {
  id: string;
  title: string;
  subject: string;
  topic: string;
  lectureDate: string;
  fileType: string;
}

export default function TeacherDashboard() {
  const { user, token } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    subject: '',
    topic: '',
    title: '',
    lectureDate: new Date().toISOString().split('T')[0],
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notes list state
  const [notes, setNotes] = useState<UploadedNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get('/api/teacher/dashboard', { headers: authHeaders });
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch teacher dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
    fetchNotes();
  }, [token]);

  const fetchNotes = async () => {
    setNotesLoading(true);
    try {
      const res = await axios.get('/api/teacher/notes', { headers: authHeaders });
      setNotes(res.data.notes || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) { setUploadError('Please select a file.'); return; }
    if (!uploadForm.subject || !uploadForm.topic || !uploadForm.title) {
      setUploadError('Subject, topic, and title are required.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('subject', uploadForm.subject);
    formData.append('topic', uploadForm.topic);
    formData.append('title', uploadForm.title);
    formData.append('lectureDate', new Date(uploadForm.lectureDate).toISOString());

    try {
      await axios.post('/api/teacher/notes', formData, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setShowUploadModal(false);
      setUploadForm({ subject: '', topic: '', title: '', lectureDate: new Date().toISOString().split('T')[0] });
      setUploadFile(null);
      setUploadProgress(0);
      await fetchNotes();
    } catch (err: any) {
      setUploadError(err?.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="text-white">Loading dashboard...</div>;

  const stats = data?.stats || {
    activeStudents: 0,
    quizzesCompleted: 0,
    assignmentsPosted: 0,
    averageClassHealth: 0,
  };

  const statCards = [
    { label: 'Active Students', value: stats.activeStudents || 'No students available', icon: UsersIcon, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Class Health', value: stats.averageClassHealth ? `${stats.averageClassHealth}%` : 'No data yet', icon: BoltIcon, color: 'text-brand', bg: 'bg-brand/10' },
    { label: 'Live Quizzes Built', value: stats.quizzesCompleted, icon: DocumentTextIcon, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Notes/Assignments', value: stats.assignmentsPosted, icon: BookOpenIcon, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

  const recentClasses = data?.recentClasses || [];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Teacher Portal</h1>
          <p className="text-textLight mt-1 text-sm bg-surface/50 px-3 py-1 rounded inline-block border border-white/5">{user?.email}</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none">Create Quiz</Button>
          <Button className="flex-1 md:flex-none" onClick={() => setShowUploadModal(true)}>Upload Note</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5 flex items-center gap-4"
          >
            <div className={`p-4 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <div>
              <p className="text-textLight text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Lecture Logs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Recent Lecture Logs</h2>
          <div className="space-y-4">
            {recentClasses.length > 0 ? recentClasses.map((ac: any) => (
              <div key={ac.id} className="flex justify-between items-center p-4 bg-surface/40 rounded-lg border border-white/5 hover:border-brand/20 transition-colors cursor-pointer">
                <div>
                  <p className="text-white font-medium">{ac.topic}</p>
                  <p className="text-sm text-textLight">{ac.subject}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-textLight">{ac.date}</p>
                  <span className="text-brand text-xs font-semibold mt-1 inline-block hover:underline">View Analytics →</span>
                </div>
              </div>
            )) : (
              <p className="text-textLight text-sm italic">No recent lecture logs found.</p>
            )}
          </div>
        </motion.div>

        {/* Uploaded Notes */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Uploaded Notes</h2>
            <Button size="sm" variant="outline" onClick={() => setShowUploadModal(true)} className="gap-2 text-xs">
              <CloudArrowUpIcon className="w-4 h-4" />
              Upload
            </Button>
          </div>
          {notesLoading ? (
            <p className="text-textLight text-sm">Loading notes...</p>
          ) : notes.length === 0 ? (
            <p className="text-textLight text-sm italic">No notes uploaded yet.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-auto custom-scrollbar">
              {notes.map((n) => (
                <div key={n.id} className="flex justify-between items-center p-3 bg-surface/40 rounded-lg border border-white/5">
                  <div>
                    <p className="text-white text-sm font-medium truncate max-w-[180px]">{n.title}</p>
                    <p className="text-xs text-textLight">{n.subject} · {n.topic}</p>
                  </div>
                  <p className="text-xs text-textLight shrink-0">{new Date(n.lectureDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Upload Note Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowUploadModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">Upload Note</h2>
                <button onClick={() => setShowUploadModal(false)}>
                  <XMarkIcon className="w-5 h-5 text-textLight hover:text-white" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-textLight outline-none focus:border-brand/50"
                  placeholder="Subject (e.g. Physics)"
                  value={uploadForm.subject}
                  onChange={(e) => setUploadForm((f) => ({ ...f, subject: e.target.value }))}
                />
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-textLight outline-none focus:border-brand/50"
                  placeholder="Topic (e.g. Quantum Mechanics)"
                  value={uploadForm.topic}
                  onChange={(e) => setUploadForm((f) => ({ ...f, topic: e.target.value }))}
                />
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-textLight outline-none focus:border-brand/50"
                  placeholder="Title (e.g. Lecture 14: Wave-Particle Duality)"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                />
                <div>
                  <label className="text-xs text-textLight mb-1 block">Lecture Date</label>
                  <input
                    type="date"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-brand/50"
                    value={uploadForm.lectureDate}
                    onChange={(e) => setUploadForm((f) => ({ ...f, lectureDate: e.target.value }))}
                  />
                </div>
                <div
                  className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-brand/40 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CloudArrowUpIcon className="w-8 h-8 text-textLight mx-auto mb-2" />
                  <p className="text-textLight text-sm">
                    {uploadFile ? uploadFile.name : 'Click to select PDF, image, or slides'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.ppt,.pptx"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                {uploading && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-textLight">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div
                        className="bg-brand h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="text-red-400 text-xs">{uploadError}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowUploadModal(false)} disabled={uploading}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
