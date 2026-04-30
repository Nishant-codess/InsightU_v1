import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  ArrowLeftIcon,
  PlusIcon,
  ClockIcon,
  LinkIcon,
  DocumentIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface Post {
  id: string;
  title?: string;
  content: string;
  authorName: string;
  links: Array<{ url: string; title: string }>;
  attachments: Array<{ url: string; name: string; type: string; size: number }>;
  createdAt: string;
}

interface Member {
  id: string;
  status: string;
  student: {
    id: string;
    name: string;
    registrationNumber: string;
    year: number;
    section: string;
  };
}

interface Classroom {
  id: string;
  name: string;
  subject: string;
  description?: string;
  inviteCode: string;
  teacher: {
    name: string;
  };
  members: Member[];
  posts: Post[];
}

export default function ClassroomDetail() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'members'>('posts');

  useEffect(() => {
    fetchClassroom();
  }, [classroomId]);

  const fetchClassroom = async () => {
    try {
      const res = await fetch(`${API}/api/classroom/${classroomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setClassroom(data.classroom);
      setIsTeacher(data.isTeacher);
    } catch (error) {
      console.error('Failed to fetch classroom:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (studentId: string) => {
    try {
      await fetch(`${API}/api/classroom/${classroomId}/members/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      fetchClassroom();
    } catch (error) {
      console.error('Failed to approve member:', error);
    }
  };

  const handleReject = async (studentId: string) => {
    try {
      await fetch(`${API}/api/classroom/${classroomId}/members/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      fetchClassroom();
    } catch (error) {
      console.error('Failed to reject member:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await fetch(`${API}/api/classroom/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchClassroom();
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Classroom not found</div>
      </div>
    );
  }

  const pendingMembers = classroom.members.filter((m) => m.status === 'PENDING');
  const approvedMembers = classroom.members.filter((m) => m.status === 'APPROVED');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/classroom')}
          className="flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Classrooms
        </button>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{classroom.name}</h1>
              <p className="text-purple-300 mb-2">{classroom.subject}</p>
              {classroom.description && <p className="text-gray-300 text-sm">{classroom.description}</p>}
              <p className="text-gray-400 text-sm mt-2">Teacher: {classroom.teacher.name}</p>
            </div>
            {isTeacher && (
              <div className="bg-purple-600/30 px-4 py-2 rounded-lg">
                <p className="text-xs text-purple-200 mb-1">Invite Code</p>
                <p className="text-lg font-mono text-white">{classroom.inviteCode}</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Requests */}
        {isTeacher && pendingMembers.length > 0 && (
          <div className="bg-yellow-500/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-yellow-500/30">
            <h3 className="text-xl font-bold text-yellow-300 mb-4">Pending Requests ({pendingMembers.length})</h3>
            <div className="space-y-3">
              {pendingMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-white/5 rounded-lg p-4"
                >
                  <div>
                    <p className="text-white font-medium">{member.student.name}</p>
                    <p className="text-gray-400 text-sm">{member.student.registrationNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(member.student.id)}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                    >
                      <CheckIcon className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(member.student.id)}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'posts'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'members'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Members ({approvedMembers.length})
          </button>
          {isTeacher && activeTab === 'posts' && (
            <button
              onClick={() => setShowPostModal(true)}
              className="ml-auto flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition"
            >
              <PlusIcon className="w-5 h-5" />
              New Post
            </button>
          )}
        </div>

        {/* Content */}
        {activeTab === 'posts' ? (
          <div className="space-y-4">
            {classroom.posts.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-xl">
                <p className="text-gray-400">No posts yet</p>
              </div>
            ) : (
              classroom.posts.map((post) => (
                <div key={post.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-purple-300 font-medium">{post.authorName}</p>
                      <p className="text-gray-400 text-sm flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {isTeacher && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {post.title && <h3 className="text-xl font-bold text-white mb-2">{post.title}</h3>}
                  <p className="text-gray-300 mb-4 whitespace-pre-wrap">{post.content}</p>

                  {/* Links */}
                  {post.links && post.links.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {post.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
                        >
                          <LinkIcon className="w-4 h-4" />
                          {link.title || link.url}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Attachments */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.attachments.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition"
                        >
                          <DocumentIcon className="w-5 h-5 text-purple-400" />
                          <span className="text-white text-sm">{file.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <div className="space-y-3">
              {approvedMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                  <div>
                    <p className="text-white font-medium">{member.student.name}</p>
                    <p className="text-gray-400 text-sm">{member.student.registrationNumber}</p>
                  </div>
                  <div className="text-gray-400 text-sm">
                    Year {member.student.year} - Section {member.student.section}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showPostModal && (
        <CreatePostModal
          classroomId={classroomId!}
          onClose={() => setShowPostModal(false)}
          onSuccess={() => {
            setShowPostModal(false);
            fetchClassroom();
          }}
        />
      )}
    </div>
  );
}

function CreatePostModal({
  classroomId,
  onClose,
  onSuccess,
}: {
  classroomId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { token } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [links, setLinks] = useState<Array<{ url: string; title: string }>>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addLink = () => {
    setLinks([...links, { url: '', title: '' }]);
  };

  const updateLink = (index: number, field: 'url' | 'title', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      if (title) formData.append('title', title);
      formData.append('content', content);
      if (links.length > 0) formData.append('links', JSON.stringify(links.filter((l) => l.url)));
      files.forEach((file) => formData.append('files', file));

      const res = await fetch(`${API}/api/classroom/${classroomId}/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to create post');

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full my-8">
        <h2 className="text-2xl font-bold text-white mb-4">Create Post</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title (Optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Post title..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Write your post..."
              rows={5}
              required
            />
          </div>

          {/* Links */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-300">Links</label>
              <button
                type="button"
                onClick={addLink}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                + Add Link
              </button>
            </div>
            {links.map((link, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(idx, 'url', e.target.value)}
                  className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://..."
                />
                <input
                  type="text"
                  value={link.title}
                  onChange={(e) => updateLink(idx, 'title', e.target.value)}
                  className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Link title"
                />
                <button
                  type="button"
                  onClick={() => removeLink(idx)}
                  className="text-red-400 hover:text-red-300"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            ))}
          </div>

          {/* Files */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Attachments</label>
            <input
              type="file"
              onChange={handleFileChange}
              multiple
              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
              className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {files.length > 0 && (
              <p className="text-gray-400 text-sm mt-1">{files.length} file(s) selected</p>
            )}
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
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
