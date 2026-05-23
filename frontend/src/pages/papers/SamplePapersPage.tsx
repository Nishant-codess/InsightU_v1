import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { CloudArrowUpIcon, DocumentTextIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

interface SamplePaper {
  id: string;
  subject: string;
  fileUrl: string;
  uploadedBy: { name: string };
  createdAt: string;
}

export default function SamplePapersPage() {
  const { user, token } = useAuthStore();
  const [papers, setPapers] = useState<SamplePaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [error, setError] = useState('');

  const isTeacher = user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN';
  const canUpload = isTeacher || isAdmin;

  const fetchPapers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/papers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPapers(await res.json());
    } catch (err) {
      console.error('Failed to fetch papers:', err);
    }
  };

  useEffect(() => { fetchPapers(); }, [token]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !subject) return;

    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('paper', file);
    formData.append('subject', subject);

    try {
      const res = await fetch(`${API}/papers/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Upload failed');
      }
      setFile(null);
      setSubject('');
      (e.target as HTMLFormElement).reset();
      fetchPapers();
    } catch (err: any) {
      setError(err.message);
      console.error('Upload failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this paper?')) return;
    try {
      await fetch(`${API}/papers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPapers();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Academic Sample Papers</h1>
        <p className="text-gray-400 mt-1">Access past papers and practice questions for your subjects.</p>
      </div>

      {/* Upload Form (Teacher/Admin only) */}
      {canUpload && (
        <form
          onSubmit={handleUpload}
          className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 space-y-4 max-w-2xl"
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CloudArrowUpIcon className="w-6 h-6 text-purple-300" />
            Upload New Sample Paper
          </h2>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Subject Name</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Data Structures"
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Select PDF File</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file || !subject}
            className="px-8 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CloudArrowUpIcon className="w-4 h-4" />
            )}
            {loading ? 'Uploading...' : 'Start Upload'}
          </button>
        </form>
      )}

      {/* Papers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {papers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 italic opacity-60 bg-white/5 rounded-2xl border border-dashed border-white/10">
            No sample papers available yet.
          </div>
        ) : (
          papers.map(paper => (
            <div
              key={paper.id}
              className="bg-white/5 border border-white/10 hover:border-purple-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <DocumentTextIcon className="w-6 h-6 text-purple-300" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-purple-300 bg-purple-500/5 px-2 py-1 rounded">
                      PDF Document
                    </span>
                    {canUpload && (
                      <button
                        onClick={() => handleDelete(paper.id)}
                        className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                  {paper.subject}
                </h3>
                <p className="text-sm text-gray-400 mt-1 italic">Uploaded by {paper.uploadedBy?.name || 'Unknown'}</p>
                <p className="text-xs text-gray-500 mt-3">{new Date(paper.createdAt).toLocaleDateString()}</p>
              </div>

              <button
                onClick={() => window.open(paper.fileUrl, '_blank')}
                className="mt-6 w-full py-2.5 bg-white/5 border border-white/10 hover:bg-purple-500/10 hover:text-purple-300 hover:border-purple-500/20 text-gray-300 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <EyeIcon className="w-4 h-4" />
                View Paper
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
