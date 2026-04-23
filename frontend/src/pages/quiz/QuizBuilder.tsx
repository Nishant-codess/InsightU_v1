import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  topicTags: string[];
  points: number;
}

export default function QuizBuilder() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [visibility, setVisibility] = useState<'PRIVATE' | 'SHAREABLE'>('PRIVATE');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      question: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      topicTags: [],
      points: 1,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      topicTags: [],
      points: 1,
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== id));
    }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const handleSaveQuiz = async () => {
    setError('');

    // Validation
    if (!title.trim()) {
      setError('Quiz title is required');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (questions.some((q) => !q.question.trim())) {
      setError('All questions must have text');
      return;
    }
    if (questions.some((q) => q.options.some((o) => !o.trim()))) {
      setError('All options must be filled');
      return;
    }
    if (questions.some((q) => q.topicTags.length === 0)) {
      setError('All questions must have at least one topic tag');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        subject,
        timePerQuestion,
        visibility,
        questions: questions.map((q) => ({
          question: q.question,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          topicTags: q.topicTags,
          points: q.points,
        })),
      };

      const response = await axios.post('/api/quiz', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Navigate to quiz library or dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">CREATE YOUR QUIZ</h1>
          <p className="text-textLight mt-2 text-sm">Build a custom quiz for solo practice or to challenge your classmates</p>
        </div>
      </div>

      {/* Quiz Metadata */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 space-y-6"
      >
        <h2 className="text-xl font-black text-white uppercase tracking-tight">Quiz Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-black text-textLight uppercase tracking-widest mb-3 block">
              Quiz Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Calculus Chapter 5 Review"
              className="w-full bg-background border border-white/10 rounded-2xl p-4 text-white placeholder-textLight/50 focus:border-brand outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-black text-textLight uppercase tracking-widest mb-3 block">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics"
              className="w-full bg-background border border-white/10 rounded-2xl p-4 text-white placeholder-textLight/50 focus:border-brand outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-black text-textLight uppercase tracking-widest mb-3 block">
              Time Per Question (seconds)
            </label>
            <input
              type="number"
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
              min="10"
              max="300"
              className="w-full bg-background border border-white/10 rounded-2xl p-4 text-white focus:border-brand outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-black text-textLight uppercase tracking-widest mb-3 block">
              Visibility
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setVisibility('PRIVATE')}
                className={`flex-1 py-4 px-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  visibility === 'PRIVATE'
                    ? 'bg-brand text-background shadow-lg shadow-brand/40'
                    : 'bg-surface border border-white/10 text-textLight hover:border-brand/50'
                }`}
              >
                <LockClosedIcon className="w-4 h-4" />
                Private
              </button>
              <button
                onClick={() => setVisibility('SHAREABLE')}
                className={`flex-1 py-4 px-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  visibility === 'SHAREABLE'
                    ? 'bg-brand text-background shadow-lg shadow-brand/40'
                    : 'bg-surface border border-white/10 text-textLight hover:border-brand/50'
                }`}
              >
                <ShareIcon className="w-4 h-4" />
                Shareable
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Questions */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Questions</h2>
          <span className="text-xs font-black text-textLight bg-surface px-3 py-1 rounded-full">
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {questions.map((question, qIndex) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 space-y-6 border-l-4 border-l-brand"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Question {qIndex + 1}
              </h3>
              {questions.length > 1 && (
                <button
                  onClick={() => removeQuestion(question.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Question Text */}
            <div>
              <label className="text-xs font-black text-textLight uppercase tracking-widest mb-3 block">
                Question Text
              </label>
              <textarea
                value={question.question}
                onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                placeholder="Enter your question here..."
                className="w-full bg-background border border-white/10 rounded-2xl p-4 text-white placeholder-textLight/50 focus:border-brand outline-none transition-all resize-none h-24"
              />
            </div>

            {/* Options */}
            <div className="space-y-4">
              <label className="text-xs font-black text-textLight uppercase tracking-widest block">
                Answer Options
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        updateQuestion(question.id, { correctAnswerIndex: oIndex })
                      }
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        question.correctAnswerIndex === oIndex
                          ? 'border-brand bg-brand'
                          : 'border-white/20 hover:border-brand/50'
                      }`}
                    >
                      {question.correctAnswerIndex === oIndex && (
                        <CheckCircleIcon className="w-4 h-4 text-background" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                      placeholder={`Option ${oIndex + 1}`}
                      className="flex-1 bg-background border border-white/10 rounded-xl p-3 text-white placeholder-textLight/50 focus:border-brand outline-none transition-all text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Topic Tags and Points */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-black text-textLight uppercase tracking-widest mb-3 block">
                  Topic Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={question.topicTags.join(', ')}
                  onChange={(e) =>
                    updateQuestion(question.id, {
                      topicTags: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter((t) => t),
                    })
                  }
                  placeholder="e.g., Derivatives, Calculus"
                  className="w-full bg-background border border-white/10 rounded-2xl p-4 text-white placeholder-textLight/50 focus:border-brand outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-black text-textLight uppercase tracking-widest mb-3 block">
                  Points
                </label>
                <input
                  type="number"
                  value={question.points}
                  onChange={(e) =>
                    updateQuestion(question.id, { points: parseInt(e.target.value) })
                  }
                  min="1"
                  max="100"
                  className="w-full bg-background border border-white/10 rounded-2xl p-4 text-white focus:border-brand outline-none transition-all"
                />
              </div>
            </div>
          </motion.div>
        ))}

        {/* Add Question Button */}
        <button
          onClick={addQuestion}
          className="w-full py-6 border-2 border-dashed border-brand/30 rounded-2xl text-brand font-black uppercase tracking-widest hover:border-brand hover:bg-brand/5 transition-all flex items-center justify-center gap-3"
        >
          <PlusIcon className="w-5 h-5" />
          Add Question
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm font-bold"
        >
          {error}
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 sticky bottom-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex-1 py-4 px-6 bg-surface border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest hover:border-white/20 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveQuiz}
          disabled={loading}
          className="flex-1 py-4 px-6 bg-brand text-background rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-brand/40 hover:scale-[1.01] active:scale-100 transition-all disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Quiz'}
        </button>
      </div>
    </div>
  );
}
