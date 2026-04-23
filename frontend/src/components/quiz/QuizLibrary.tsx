import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  PlayIcon,
  ShareIcon,
  LockClosedIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Quiz {
  id: string;
  title: string;
  subject: string;
  questions: any[];
  visibility: 'PRIVATE' | 'SHAREABLE';
  createdAt: string;
  lastPlayedAt?: string;
}

export default function QuizLibrary() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuizzes();
  }, [token]);

  const fetchQuizzes = async () => {
    try {
      const response = await axios.get('/api/quiz/library', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuizzes(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;

    try {
      await axios.delete(`/api/quiz/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuizzes(quizzes.filter((q) => q.id !== quizId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete quiz');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-4"></div>
        <p className="text-textLight text-sm font-bold">Loading your quizzes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
            My Quiz Library
          </h2>
          <p className="text-textLight text-sm mt-1">
            {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/quiz/builder')}
          className="flex items-center gap-2 px-6 py-3 bg-brand text-background rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand/40 hover:scale-[1.01] active:scale-100 transition-all"
        >
          <PlusIcon className="w-5 h-5" />
          Create Quiz
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      {/* Quiz Grid */}
      {quizzes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center space-y-4 border-dashed border-2 border-white/10"
        >
          <p className="text-lg font-black text-white">No quizzes yet</p>
          <p className="text-textLight text-sm">
            Create your first quiz to get started with solo practice or challenge your classmates!
          </p>
          <button
            onClick={() => navigate('/quiz/builder')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand/10 border border-brand/30 text-brand rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand hover:text-background transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            Create Your First Quiz
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card p-6 space-y-4 group hover:border-brand/50 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight line-clamp-2">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-textLight font-bold mt-1">{quiz.subject}</p>
                </div>
                <div
                  className={`flex-shrink-0 p-2 rounded-lg ${
                    quiz.visibility === 'PRIVATE'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-green-500/10 text-green-400'
                  }`}
                >
                  {quiz.visibility === 'PRIVATE' ? (
                    <LockClosedIcon className="w-4 h-4" />
                  ) : (
                    <ShareIcon className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 py-4 border-y border-white/5">
                <div>
                  <p className="text-[10px] text-textLight font-black uppercase tracking-widest">
                    Questions
                  </p>
                  <p className="text-xl font-black text-white">
                    {Array.isArray(quiz.questions) ? quiz.questions.length : 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-textLight font-black uppercase tracking-widest">
                    Last Played
                  </p>
                  <p className="text-sm font-bold text-textLight">
                    {quiz.lastPlayedAt
                      ? new Date(quiz.lastPlayedAt).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/quiz/${quiz.id}/solo`)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand/10 border border-brand/30 text-brand rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand hover:text-background transition-all"
                >
                  <PlayIcon className="w-4 h-4" />
                  Play
                </button>
                <button
                  onClick={() => navigate(`/quiz/${quiz.id}/edit`)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface border border-white/10 text-textLight rounded-xl font-black text-xs uppercase tracking-widest hover:border-white/20 transition-all"
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
