import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import * as faceapi from 'face-api.js';

const API = import.meta.env.VITE_API_URL ?? '';

interface ViolationEvent {
  type: 'fullscreen_exit' | 'tab_switch' | 'face_not_detected';
  timestamp: string;
}

interface AIQuestion {
  type: 'MCQ' | 'SHORT';
  question: string;
  options?: string[];
  answer?: string;
  idealAnswer?: string;
  explanation?: string;
}

export default function AITestRunner() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { quiz: any; topics: string } | undefined;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const violationsRef = useRef<ViolationEvent[]>([]);
  const answersRef = useRef<string[]>([]);
  const testStartTimeRef = useRef<number>(0);
  const submittedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noFaceCountRef = useRef(0);

  useEffect(() => { answersRef.current = answers; }, [answers]);

  useEffect(() => {
    if (!state?.quiz) {
      navigate('/ai-tests');
      return;
    }
    const totalTime = state.quiz.questions.length * (state.quiz.timePerQuestion || 60);
    setTimeLeft(totalTime);
    setAnswers(new Array(state.quiz.questions.length).fill(''));
    testStartTimeRef.current = Date.now();
  }, [state, navigate]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current || !state?.quiz) return;
    submittedRef.current = true;
    setSubmitted(true);

    try {
      // First, grade any SHORT questions via AI if needed
      const responsesToGrade = state.quiz.questions.map((q: AIQuestion, i: number) => {
        if (q.type === 'SHORT') {
          return { question: q.question, idealAnswer: q.idealAnswer, answer: answersRef.current[i] };
        }
        return null;
      }).filter(Boolean);

      let gradingResults: any[] = [];
      if (responsesToGrade.length > 0) {
        const res = await fetch(`${API}/api/ai-quiz/grade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ responses: responsesToGrade }),
        });
        if (res.ok) {
          const data = await res.json();
          gradingResults = data.results || [];
        }
      }

      // Calculate score
      let score = 0;
      let shortIndex = 0;
      state.quiz.questions.forEach((q: AIQuestion, i: number) => {
        if (q.type === 'MCQ') {
          if (answersRef.current[i] === q.answer) score += 1;
        } else if (q.type === 'SHORT') {
          const result = gradingResults[shortIndex++];
          if (result && result.score === 1) score += 1;
        }
      });

      // Save result
      await fetch(`${API}/api/ai-quiz/save-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: state.quiz.subject,
          topic: state.topics,
          score,
          totalQuestions: state.quiz.questions.length,
          status: violationsRef.current.length >= 3 ? 'DISQUALIFIED' : 'COMPLETED',
          details: {
            questions: state.quiz.questions,
            userAnswers: answersRef.current,
            violations: violationsRef.current,
          }
        }),
      });
    } catch (e) {
      console.error('Submit failed:', e);
    } finally {
      webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
      navigate('/ai-tests');
    }
  }, [state, token, navigate]);

  const logViolation = useCallback((type: ViolationEvent['type']) => {
    const v: ViolationEvent = { type, timestamp: new Date().toISOString() };
    violationsRef.current = [...violationsRef.current, v];
    if (violationsRef.current.length >= 3) doSubmit();
  }, [doSubmit]);

  useEffect(() => {
    const init = async () => {
      try {
        await document.documentElement.requestFullscreen().catch(() => {});
        const stream = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null);
        if (stream) {
          webcamStreamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        }
        
        try {
          const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          faceIntervalRef.current = setInterval(async () => {
            if (!videoRef.current) return;
            try {
              const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
              if (detections.length === 0) {
                noFaceCountRef.current += 1;
                if (noFaceCountRef.current >= 10) {
                  logViolation('face_not_detected');
                  setWarningMessage('No face detected! Please ensure your face is visible.');
                  setShowWarning(true);
                  noFaceCountRef.current = 0;
                }
              } else {
                noFaceCountRef.current = 0;
              }
            } catch {}
          }, 1000);
        } catch {}
        
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize test');
        setLoading(false);
      }
    };
    if (state?.quiz) init();

    const block = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.body.style.userSelect = 'none';

    const fsHandler = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        logViolation('fullscreen_exit');
        setWarningMessage('You exited fullscreen! Please return to fullscreen.');
        setShowWarning(true);
      }
    };
    document.addEventListener('fullscreenchange', fsHandler);

    const onHide = () => { if (document.hidden && !submittedRef.current) logViolation('tab_switch'); };
    document.addEventListener('visibilitychange', onHide);

    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.body.style.userSelect = '';
      document.removeEventListener('fullscreenchange', fsHandler);
      document.removeEventListener('visibilitychange', onHide);
      webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
    };
  }, [state, logViolation]);

  useEffect(() => {
    if (loading || !state?.quiz) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { doSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, state, doSubmit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a15]">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
          <p className="text-lg font-black uppercase tracking-widest">Initializing AI Test...</p>
        </div>
      </div>
    );
  }

  if (error || !state?.quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a15]">
        <div className="text-center space-y-4">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto" />
          <p className="text-red-400 text-lg font-black">{error || 'Test not found'}</p>
          <button onClick={() => navigate('/ai-tests')} className="px-6 py-3 bg-purple-500 text-white rounded-2xl font-black uppercase tracking-widest">
            Back to AI Tests
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = state.quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / state.quiz.questions.length) * 100;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#0a0a15] p-4 font-sans text-white">
      {showWarning && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-red-500/90 z-50 flex items-center justify-center">
          <div className="text-center p-8">
            <ExclamationTriangleIcon className="w-24 h-24 mx-auto mb-4" />
            <h2 className="text-3xl font-black uppercase mb-4">Warning!</h2>
            <p className="text-xl mb-4">{warningMessage}</p>
            <p className="text-lg mb-6">Violations: {violationsRef.current.length}/3</p>
            <button onClick={() => { setShowWarning(false); if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); }} className="px-8 py-4 bg-white text-red-500 rounded-2xl font-black uppercase">
              Continue Test
            </button>
          </div>
        </motion.div>
      )}

      <div className="fixed bottom-4 right-4 z-40">
        <div className="relative w-[120px] h-[90px] bg-black rounded-lg overflow-hidden border-2 border-purple-500">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute top-1 right-1"><VideoCameraIcon className="w-4 h-4 text-purple-500" /></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center pt-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">{state.quiz.title}</h1>
          <p className="text-gray-400 text-sm">{state.quiz.subject} • {state.topics}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <ClockIcon className="w-5 h-5 text-purple-400" />
            <span className={`text-2xl font-black ${timeLeft <= 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-black text-gray-400 uppercase">Question {currentQuestionIndex + 1} of {state.quiz.questions.length}</span>
          <span className="text-xs font-black text-purple-400 uppercase">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div animate={{ width: `${progress}%` }} className="h-full bg-purple-500" transition={{ duration: 0.3 }} />
        </div>
      </div>

      <motion.div key={currentQuestionIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 space-y-6">
        <div className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-black uppercase rounded-lg border border-purple-500/20">
          {currentQuestion.type === 'MCQ' ? 'Multiple Choice' : 'Short Answer'}
        </div>
        <h2 className="text-xl font-medium leading-tight">{currentQuestion.question}</h2>

        <div className="space-y-3 mt-6">
          {currentQuestion.type === 'MCQ' && currentQuestion.options ? (
            currentQuestion.options.map((option: string, index: number) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  const newAnswers = [...answers];
                  newAnswers[currentQuestionIndex] = option;
                  setAnswers(newAnswers);
                }}
                className={`w-full p-4 rounded-xl text-left font-medium transition-all border-2 ${
                  answers[currentQuestionIndex] === option ? 'bg-purple-500/20 text-purple-300 border-purple-500' : 'bg-black/30 border-white/10 text-gray-300 hover:border-purple-500/50'
                }`}
              >
                {option}
              </motion.button>
            ))
          ) : (
            <textarea
              className="w-full h-40 bg-black/30 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-500 focus:border-purple-500 outline-none"
              placeholder="Type your descriptive answer here..."
              value={answers[currentQuestionIndex]}
              onChange={(e) => {
                const newAnswers = [...answers];
                newAnswers[currentQuestionIndex] = e.target.value;
                setAnswers(newAnswers);
              }}
            />
          )}
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto mt-6 flex gap-4 pb-20">
        <button onClick={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0} className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-black uppercase disabled:opacity-50">Previous</button>
        {currentQuestionIndex < state.quiz.questions.length - 1 ? (
          <button onClick={() => setCurrentQuestionIndex((p) => p + 1)} className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black uppercase">Next Question</button>
        ) : (
          <button onClick={doSubmit} disabled={submitted} className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-400 text-white rounded-xl font-black uppercase disabled:opacity-50">{submitted ? 'Evaluating...' : 'Submit Test'}</button>
        )}
      </div>
    </div>
  );
}
