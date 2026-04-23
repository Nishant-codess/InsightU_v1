import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/useAuthStore';
import {
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';

interface SectionComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface SectionPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  attachments: string[] | null;
  createdAt: string;
  sectionKey: string;
  comments?: SectionComment[];
}

export default function SectionDashboard() {
  const { user, token } = useAuthStore();
  const [posts, setPosts] = useState<SectionPost[]>([]);
  const [classmates, setClassmates] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<Record<string, SectionComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Compute sectionKey from user data
  const sectionKey =
    user?.student
      ? `${user.student.year}-${user.student.section}-${user.student.department}`
      : null;

  // Section display label
  const rawSection = user?.student?.section || 'A';
  const displaySection = /^[A-Z]\d$/.test(rawSection)
    ? rawSection
    : `${rawSection}${user?.student?.batch === 'Batch 1' ? '1' : '2'}`;

  // Determine role for badge display
  const isTeacher = user?.role === 'TEACHER';

  // Fetch section details + posts
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setLoading(true);

        // Fetch classmates/teachers via existing endpoint
        if (user.student?.id) {
          const detailsRes = await axios.get(`/api/section/details/${user.student.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setClassmates(detailsRes.data.classmates || []);
          setTeachers(detailsRes.data.teachers || []);
        }

        // Fetch posts via new feed endpoint
        if (sectionKey) {
          const postsRes = await axios.get('/api/section/feed/posts', {
            params: { sectionKey },
            headers: { Authorization: `Bearer ${token}` },
          });
          setPosts(postsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch section data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.student?.id, sectionKey, token]);

  // WebSocket: join section room and listen for new posts
  useEffect(() => {
    if (!sectionKey || !token) return;

    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    socket.emit('join-section', sectionKey);

    socket.on('NEW_SECTION_POST', (post: SectionPost) => {
      setPosts((prev) => [post, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [sectionKey, token]);

  const handlePost = async () => {
    if (!newPost.trim() || !user || !sectionKey) return;
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('sectionKey', sectionKey);
      formData.append('content', newPost);
      if (selectedFile) {
        formData.append('attachments', selectedFile);
      }

      await axios.post('/api/section/feed/posts', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setNewPost('');
      setSelectedFile(null);
      // Post will arrive via WebSocket; no need to manually prepend
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setPosting(false);
    }
  };

  const toggleComments = async (postId: string) => {
    const isExpanding = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: isExpanding }));

    if (isExpanding && !postComments[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await axios.get(`/api/section/feed/posts/${postId}/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPostComments((prev) => ({ ...prev, [postId]: res.data }));
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content || !token) return;

    try {
      const res = await axios.post(
        `/api/section/feed/posts/${postId}/comments`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), res.data],
      }));
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const getRoleBadge = (authorId: string) => {
    // Check if author is a teacher by matching against teachers list
    const isAuthorTeacher = teachers.some((t) => t.userId === authorId) || isTeacher && authorId === user?.id;
    return isAuthorTeacher ? 'FACULTY' : 'STUDENT';
  };

  const getRoleBadgeStyle = (badge: string) =>
    badge === 'FACULTY'
      ? 'bg-brand/20 text-brand border border-brand/30'
      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30';

  const getAvatarStyle = (badge: string) =>
    badge === 'FACULTY' ? 'bg-brand' : 'bg-blue-500';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full relative">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-2xl">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Feed Column */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-7 h-7 text-brand" />
            Section {displaySection} Activity
          </h1>
        </div>

        {/* Create Post Card */}
        <div className="glass-card p-4 space-y-4 border-brand/20">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share something with your section..."
            className="w-full bg-surface/50 border border-white/10 rounded-xl p-4 text-white placeholder-textLight/50 focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all resize-none h-24"
          />
          {selectedFile && (
            <p className="text-xs text-textLight flex items-center gap-1">
              <PaperClipIcon className="w-4 h-4" />
              {selectedFile.name}
            </p>
          )}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-textLight hover:text-brand transition-colors rounded-lg hover:bg-white/5"
                title="Attach file"
              >
                <PaperClipIcon className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={handlePost} disabled={!newPost.trim() || posting}>
              {posting ? 'Posting...' : 'Post Update'}
            </Button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.map((post) => {
            const badge = getRoleBadge(post.authorId);
            const comments = postComments[post.id] || post.comments || [];
            const isExpanded = expandedComments[post.id];

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5"
              >
                {/* Post header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${getAvatarStyle(badge)}`}
                    >
                      {post.authorName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold">{post.authorName}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getRoleBadgeStyle(badge)}`}>
                          {badge}
                        </span>
                      </div>
                      <p className="text-xs text-textLight font-medium">
                        {new Date(post.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Post content */}
                <p className="text-sm text-textLight leading-relaxed mb-3">{post.content}</p>

                {/* Attachments */}
                {post.attachments && post.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.attachments.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-brand hover:underline bg-brand/10 px-2 py-1 rounded"
                      >
                        <PaperClipIcon className="w-3 h-3" />
                        Attachment {i + 1}
                      </a>
                    ))}
                  </div>
                )}

                {/* Comments toggle */}
                <button
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-1 text-xs text-textLight hover:text-white transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                  Comments ({comments.length})
                </button>

                {/* Expandable comment thread */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-3 border-t border-white/10 pt-3"
                    >
                      {loadingComments[post.id] ? (
                        <p className="text-xs text-textLight">Loading comments...</p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="flex gap-2">
                            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {c.authorName[0]}
                            </div>
                            <div className="bg-surface/50 rounded-xl px-3 py-2 flex-1">
                              <p className="text-xs font-semibold text-white">{c.authorName}</p>
                              <p className="text-xs text-textLight">{c.content}</p>
                              <p className="text-[10px] text-textLight/50 mt-1">
                                {new Date(c.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Add comment form */}
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-surface/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-textLight/50 focus:outline-none focus:ring-1 focus:ring-brand/50"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="px-3 py-1.5 bg-brand text-background text-xs font-bold rounded-lg disabled:opacity-40 hover:bg-brand/90 transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {posts.length === 0 && !loading && (
            <div className="text-center py-20 opacity-30">
              <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4" />
              <p>No activity yet in this section.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Info Column */}
      <div className="space-y-6">
        <div className="glass-card p-5 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-brand uppercase tracking-widest mb-4 flex items-center gap-2">
              <AcademicCapIcon className="w-4 h-4" />
              Section Faculty
            </h2>
            <div className="space-y-3">
              {teachers.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium group-hover:text-brand transition-colors">
                      {t.name}
                    </p>
                    <p className="text-[10px] text-textLight">{t.subjects?.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-5">
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4" />
              Classmates
            </h2>
            <div className="space-y-3">
              {classmates.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                    {c.name[0]}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium group-hover:text-blue-400 transition-colors">
                      {c.name}
                    </p>
                    <p className="text-[10px] text-textLight">{c.registrationNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-5 bg-gradient-to-br from-brand/10 to-transparent border-t-brand/30">
          <h3 className="text-white font-semibold text-sm mb-2">My Cohort</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface/50 p-2 rounded border border-white/5 text-center">
              <p className="text-[10px] text-textLight uppercase tracking-tighter">Section</p>
              <p className="text-lg font-bold text-white uppercase">{displaySection}</p>
            </div>
            <div className="bg-surface/50 p-2 rounded border border-white/5 text-center">
              <p className="text-[10px] text-textLight uppercase tracking-tighter">Year</p>
              <p className="text-lg font-bold text-white">{user?.student?.year || '2'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
