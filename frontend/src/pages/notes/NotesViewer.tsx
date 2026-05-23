import { useEffect, useState } from 'react';
import {
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  ArrowTopRightOnSquareIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

import { useAuthStore } from '../../store/useAuthStore';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

type ApprovedNote = {
  id: string;
  title: string;
  subject: string;
  fileUrl: string;
  date?: string;
  createdAt: string;
  classroom?: { name: string };
};

type StudentNoteStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type StudentNote = {
  id: string;
  title: string;
  subject: string;
  fileUrl: string;
  status: StudentNoteStatus;
  date?: string;
  createdAt: string;
};

const STATUS_CONFIG: Record<StudentNoteStatus, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING: {
    label: 'Pending',
    icon: <ClockIcon className="w-3.5 h-3.5" />,
    className: 'bg-yellow-500/15 text-yellow-400 border-yellow-400/40',
  },
  APPROVED: {
    label: 'Approved',
    icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
    className: 'bg-green-500/15 text-green-400 border-green-400/40',
  },
  REJECTED: {
    label: 'Rejected',
    icon: <XCircleIcon className="w-3.5 h-3.5" />,
    className: 'bg-red-500/15 text-red-400 border-red-400/40',
  },
};

export default function NotesViewer() {
  const { user, token } = useAuthStore();
  const [approvedNotes, setApprovedNotes] = useState<ApprovedNote[]>([]);
  const [myUploads, setMyUploads] = useState<StudentNote[]>([]);
  const [pendingNotes, setPendingNotes] = useState<StudentNote[]>([]); // For teacher review
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const isStudent = user?.role === 'STUDENT';
  const isTeacher = user?.role === 'TEACHER';

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const fetchApprovedNotes = async () => {
    if (!headers) return;
    setIsLoadingNotes(true);
    try {
      const res = await fetch(`${API}/notes`, { headers });
      if (res.ok) setApprovedNotes(await res.json());
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const fetchMyUploads = async () => {
    if (!isStudent || !headers) return;
    try {
      const res = await fetch(`${API}/student-notes/my`, { headers });
      if (res.ok) setMyUploads(await res.json());
    } catch (err) {
      console.error('Failed to fetch uploads:', err);
    }
  };

  const fetchPendingNotes = async () => {
    if (!isTeacher || !headers) return;
    try {
      const res = await fetch(`${API}/student-notes/pending`, { headers });
      if (res.ok) setPendingNotes(await res.json());
    } catch (err) {
      console.error('Failed to fetch pending notes:', err);
    }
  };

  useEffect(() => {
    fetchApprovedNotes();
    fetchMyUploads();
    fetchPendingNotes();
  }, [token]);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!headers || !file || !title.trim()) return;

    setIsUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('subject', subject.trim());
      if (date) formData.append('date', date);
      formData.append('file', file);

      const res = await fetch(`${API}/student-notes/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Upload failed');
      }

      setTitle('');
      setSubject('');
      setDate('');
      setFile(null);
      fetchMyUploads();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproveNote = async (noteId: string, action: 'APPROVED' | 'REJECTED') => {
    if (!headers) return;
    try {
      const res = await fetch(`${API}/student-notes/${noteId}/review`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error('Review failed');
      fetchPendingNotes();
      fetchApprovedNotes();
    } catch (err) {
      console.error('Review error:', err);
    }
  };

  const toAbsoluteUrl = (url: string) => (url.startsWith('http') ? url : `${API.replace('/api', '')}${url}`);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 flex items-center gap-2">
          <XCircleIcon className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Lecture Notes Repository */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Lecture Notes Repository</h2>
          <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            {approvedNotes.length} notes
          </span>
        </div>

        {isLoadingNotes ? (
          <p className="text-sm text-gray-400">Loading notes...</p>
        ) : approvedNotes.length === 0 ? (
          <div className="py-8 text-center text-gray-400 italic opacity-60 border border-dashed border-white/10 rounded-xl">
            <DocumentArrowUpIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No notes published yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvedNotes.map(note => (
              <div
                key={note.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3 hover:border-white/20 transition"
              >
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{note.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {note.subject && <span>{note.subject} • </span>}
                    {note.date
                      ? new Date(note.date).toLocaleDateString()
                      : new Date(note.createdAt).toLocaleDateString()}
                    {note.classroom && <span> • {note.classroom.name}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => window.open(toAbsoluteUrl(note.fileUrl), '_blank')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-medium transition"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    Open
                  </button>
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = toAbsoluteUrl(note.fileUrl);
                      a.download = `${note.title}.pdf`;
                      a.click();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-medium transition"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student: Upload Notes */}
      {isStudent && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CloudArrowUpIcon className="w-5 h-5 text-purple-300" />
            Upload Notes for Review
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Enter note title"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white focus:border-purple-500 outline-none transition"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Data Structures"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white focus:border-purple-500 outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white focus:border-purple-500 outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">File (PDF) *</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-2 text-gray-300 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isUploading}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CloudArrowUpIcon className="w-4 h-4" />
              )}
              {isUploading ? 'Uploading...' : 'Submit for Review'}
            </button>
          </form>
        </div>
      )}

      {/* Student: My Uploads */}
      {isStudent && (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">My Uploads</h2>
          {myUploads.length === 0 ? (
            <p className="text-sm text-gray-400">No uploads yet.</p>
          ) : (
            <div className="space-y-3">
              {myUploads.map(upload => {
                const cfg = STATUS_CONFIG[upload.status];
                return (
                  <div
                    key={upload.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{upload.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {upload.subject && <span>{upload.subject} • </span>}
                        {upload.date
                          ? new Date(upload.date).toLocaleDateString()
                          : new Date(upload.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-semibold ${cfg.className}`}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Teacher: Pending Student Notes for Review */}
      {isTeacher && pendingNotes.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-yellow-400" />
            Pending Student Notes ({pendingNotes.length})
          </h2>
          <div className="space-y-3">
            {pendingNotes.map((note: any) => (
              <div
                key={note.id}
                className="rounded-xl border border-yellow-500/20 bg-white/5 p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{note.title}</p>
                  <p className="text-xs text-gray-400">
                    {note.student?.name || 'Student'} • {note.subject}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => window.open(toAbsoluteUrl(note.fileUrl), '_blank')}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-medium transition"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleApproveNote(note.id, 'APPROVED')}
                    className="px-3 py-1.5 bg-green-500/20 border border-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-xs font-medium transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproveNote(note.id, 'REJECTED')}
                    className="px-3 py-1.5 bg-red-500/20 border border-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-medium transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
