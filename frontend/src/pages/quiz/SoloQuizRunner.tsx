import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface SoloAnswer {
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  timeSpent: number;
}

interface SoloQuizResult {
  quizId: string;
  title: string;
  score: number;
  totalPoints: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  topicBreakdown: Array<{
    topic: string;
    correct: number;
    total: number;
    percentage: number;
  }>;
  completedAt: Date;
}

export default function SoloQuizRunner() {
  const { quizId } = useParams<{ quizId: string }>();
  const { token } = useAuthStore();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<SoloAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SoloQuizResult | null>(null);
  const [error, setError] = useState('');
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);

  // Fetch quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await axios.get(`/api/quiz/${quizId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setQuiz(response.data);
        setTimeLeft(response.data.timePerQuestion);
        setQuestionStartTime(Date.now());
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    }
  }, [quizId, token]);

  // Timer
  useEffect(() => {
    if (!quiz || result) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleSubmitAnswer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quiz, result]);

  const handleSubmitAnswer = async (optionIndex: number | null) => {
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isCorrect = optionIndex === currentQuestion.correctAnswerIndex;

    const newAnswer: SoloAnswer = {
      questionIndex: currentQuestionIndex,
      selectedOption: optionIndex ?? -1,
      isCorrect,
      timeSpent,
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setTimeLeft(quiz.timePerQuestion);
      setQuestionStartTime(Date.now());
    } else {
      // Quiz complete - submit
      await submitQuiz(newAnswers);
    }
  };

  const submitQuiz = async (finalAnswers: SoloAnswer[]) => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `/api/quiz/${quizId}/solo/attempt`,
        { answers: finalAnswers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-lg font-black uppercase tracking-widest">Loading Quiz...</p>
        </div>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-400 text-lg font-black mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-brand text-background rounded-2xl font-black uppercase tracking-widest"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    return <SoloQuizResults result={result} onClose={() => navigate('/dashboard')} />;
  }

  if (!quiz) return null;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
            {quiz.title}
          </h1>
          <p className="text-textLight text-sm">{quiz.subject}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-black text-textLight uppercase tracking-widest">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
            <span className="text-xs font-black text-brand uppercase tracking-widest">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-brand"
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question Card */}
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="glass-card p-8 space-y-8 mb-8"
        >
          {/* Timer */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-black text-textLight uppercase tracking-widest">
                Time Remaining
              </p>
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-brand" />
                <span
                  className={`text-3xl font-black tracking-tighter ${
                    timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'
                  }`}
                >
                  {timeLeft}s
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-textLight uppercase tracking-widest mb-1">
                Points
              </p>
              <p className="text-2xl font-black text-brand">{currentQuestion.points}</p>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <h2 className="text-2xl font-black text-white leading-tight">
              {currentQuestion.question}
            </h2>
            <div className="flex flex-wrap gap-2 mt-4">
              {currentQuestion.topicTags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-xs font-black text-brand bg-brand/10 px-3 py-1 rounded-full uppercase tracking-widest"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option: string, index: number) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedOption(index)}
                className={`w-full p-4 rounded-2xl text-left font-bold uppercase tracking-widest transition-all border-2 ${
                  selectedOption === index
                    ? 'bg-brand text-background border-brand shadow-lg shadow-brand/40'
                    : 'bg-surface border-white/10 text-white hover:border-brand/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedOption === index
                        ? 'bg-background border-background'
                        : 'border-white/30'
                    }`}
                  >
                    {selectedOption === index && (
                      <div className="w-2 h-2 bg-brand rounded-full" />
                    )}
                  </div>
                  <span className="text-sm">{option}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Submit Button */}
        <button
          onClick={() => handleSubmitAnswer(selectedOption)}
          disabled={selectedOption === null || submitting}
          className="w-full py-4 px-6 bg-brand text-background rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-brand/40 hover:scale-[1.01] active:scale-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestionIndex === quiz.questions.length - 1
            ? submitting
              ? 'Submitting...'
              : 'Submit Quiz'
            : 'Next Question'}
        </button>
      </motion.div>
    </div>
  );
}

function SoloQuizResults({
  result,
  onClose,
}: {
  result: SoloQuizResult;
  onClose: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl space-y-8"
      >
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center space-y-6 bg-gradient-to-br from-brand/10 to-transparent border-brand/20"
        >
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
            Quiz Complete!
          </h1>

          <div className="space-y-2">
            <p className="text-xs font-black text-textLight uppercase tracking-widest">
              Your Score
            </p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-7xl font-black text-brand tracking-tighter">
                {result.percentage}%
              </span>
              <span className="text-2xl font-black text-textLight">
                ({result.score}/{result.totalPoints})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
            <div>
              <p className="text-xs font-black text-green-400 uppercase tracking-widest mb-2">
                Correct
              </p>
              <p className="text-3xl font-black text-white">{result.correctCount}</p>
            </div>
            <div>
              <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-2">
                Incorrect
              </p>
              <p className="text-3xl font-black text-white">{result.incorrectCount}</p>
            </div>
          </div>
        </motion.div>

        {/* Topic Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 space-y-6"
        >
          <div className="flex items-center gap-3">
            <ChartBarIcon className="w-6 h-6 text-brand" />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              Topic Breakdown
            </h2>
          </div>

          <div className="space-y-4">
            {result.topicBreakdown.map((topic) => (
              <div key={topic.topic} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">{topic.topic}</span>
                  <span className="text-xs font-black text-textLight">
                    {topic.correct}/{topic.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${topic.percentage}%` }}
                    className={`h-full ${
                      topic.percentage >= 70
                        ? 'bg-green-400'
                        : topic.percentage >= 50
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                    }`}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
                <p className="text-xs text-textLight font-bold">{topic.percentage}%</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 px-6 bg-surface border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest hover:border-white/20 transition-all"
          >
            Back to Dashboard
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-4 px-6 bg-brand text-background rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-brand/40 hover:scale-[1.01] active:scale-100 transition-all"
          >
            Try Another Quiz
          </button>
        </div>
      </motion.div>
    </div>
  );
}
