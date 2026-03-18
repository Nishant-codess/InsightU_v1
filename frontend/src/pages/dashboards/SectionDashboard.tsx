import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { ChatBubbleLeftRightIcon, PaperClipIcon, UserGroupIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';

// Section collaboration view (GCR/WhatsApp style)
export default function SectionDashboard() {
  const { user } = useAuthStore();
  const [activeSubject, setActiveSubject] = useState('All');
  const [posts, setPosts] = useState<any[]>([]);
  const [classmates, setClassmates] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');

  const subjects = ['All', 'Physics', 'Math', 'CS', 'Chemistry'];
  
  // Req 22.2.2: Section A1/A2 logic
  const displaySection = `${user?.student?.section || 'A'}${user?.student?.batch === 'Batch 1' ? '1' : '2'}`;

  // Mock data for immediate visual feedback (Integration to follow)
  useEffect(() => {
    setClassmates([
      { id: '1', name: 'Aarav Sharma', reg: 'RA241100...' },
      { id: '2', name: 'Isha Patel', reg: 'RA241100...' },
      { id: '3', name: 'Rohan Gupta', reg: 'RA241100...' }
    ]);
    setTeachers([
      { id: 't1', name: 'Dr. Sameer (Physics)', subjects: ['Physics 101'] },
      { id: 't2', name: 'Prof. Anjali (Math)', subjects: ['Calculus II'] }
    ]);
    setPosts([
      { id: 'p1', author: 'Dr. Sameer', role: 'TEACHER', subject: 'Physics', content: 'Hey everyone, I have uploaded the lecture notes for Quantum Mechanics. Check the Notes section!', time: '2 hours ago' },
      { id: 'p2', author: 'Isha Patel', role: 'STUDENT', subject: 'CS', content: 'Does anyone have the Batch 1 timetable for Thursday?', time: '4 hours ago' },
      { id: 'p3', author: 'Prof. Anjali', role: 'TEACHER', subject: 'Math', content: 'The assignment for Calculus II is due tomorrow. Please submit on portal.', time: '5 hours ago' }
    ]);
  }, []);

  const filteredPosts = activeSubject === 'All' 
    ? posts 
    : posts.filter(p => p.subject === activeSubject);

  const handlePost = () => {
     if (!newPost.trim()) return;
     const post = {
       id: Date.now().toString(),
       author: user?.name || 'Me',
       role: user?.role,
       subject: activeSubject === 'All' ? 'General' : activeSubject,
       content: newPost,
       time: 'Just now'
     };
     setPosts([post, ...posts]);
     setNewPost('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      
      {/* Feed Column */}
      <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                 <ChatBubbleLeftRightIcon className="w-7 h-7 text-brand" />
                 Section {displaySection} Activity
              </h1>
              
              {/* Subject Tabs */}
              <div className="flex bg-surface/50 border border-white/5 p-1 rounded-xl backdrop-blur-sm overflow-x-auto no-scrollbar">
                  {subjects.map(s => (
                      <button
                        key={s}
                        onClick={() => setActiveSubject(s)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                            activeSubject === s 
                            ? 'bg-brand text-background shadow-lg shadow-brand/20' 
                            : 'text-textLight hover:text-white'
                        }`}
                      >
                          {s}
                      </button>
                  ))}
              </div>
          </div>

          {/* Create Post Card */}
          <div className="glass-card p-4 space-y-4 border-brand/20">
              <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Posting to: {activeSubject === 'All' ? 'General' : activeSubject}</span>
              </div>
              <textarea 
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder={`Share something with ${activeSubject === 'All' ? 'your section' : activeSubject + ' group'}...`}
                className="w-full bg-surface/50 border border-white/10 rounded-xl p-4 text-white placeholder-textLight/50 focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all resize-none h-24"
              />
              <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                      <button className="p-2 text-textLight hover:text-brand transition-colors rounded-lg hover:bg-white/5">
                         <PaperClipIcon className="w-5 h-5" />
                      </button>
                  </div>
                  <Button onClick={handlePost} disabled={!newPost.trim()}>Post Update</Button>
              </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-4">
              {filteredPosts.map((post) => (
                  <motion.div 
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5"
                  >
                      <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${post.role === 'TEACHER' ? 'bg-brand' : 'bg-blue-500'}`}>
                                  {post.author[0]}
                              </div>
                              <div>
                                  <div className="flex items-center gap-2">
                                      <p className="text-white font-semibold">{post.author}</p>
                                      {post.role === 'TEACHER' && <span className="text-[10px] bg-brand/20 text-brand px-2 py-0.5 rounded-full border border-brand/30">FACULTY</span>}
                                      <span className="text-[10px] text-textLight px-2 py-0.5 rounded-full border border-white/5 bg-white/5 uppercase tracking-tighter">{post.subject}</span>
                                  </div>
                                  <p className="text-xs text-textLight font-medium">{post.time}</p>
                              </div>
                          </div>
                      </div>
                      <p className="text-sm text-textLight leading-relaxed">{post.content}</p>
                  </motion.div>
              ))}
              {filteredPosts.length === 0 && (
                  <div className="text-center py-20 opacity-30">
                      <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4" />
                      <p>No activity yet in this subject group.</p>
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
                      {teachers.map(t => (
                          <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                              <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs">
                                  {t.name[0]}
                              </div>
                              <div>
                                  <p className="text-sm text-white font-medium group-hover:text-brand transition-colors">{t.name}</p>
                                  <p className="text-[10px] text-textLight">{t.subjects.join(', ')}</p>
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
                      {classmates.map(c => (
                          <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                                  {c.name[0]}
                              </div>
                              <div>
                                  <p className="text-sm text-white font-medium group-hover:text-blue-400 transition-colors">{c.name}</p>
                                  <p className="text-[10px] text-textLight">{c.reg}</p>
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
