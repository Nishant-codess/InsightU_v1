import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import * as faceapi from 'face-api.js';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface ViolationEvent {
  type: 'fullscreen_exit' | 'tab_switch' | 'face_not_detected';
  timestamp: string;
}

interface TestAnswer {
  questionId: string;
  selectedOption: number;
}

interface MockTest {
  id: string;
  name: string;
  subject: string;
  questionCount: number;
  questions: { id: string; text: string; options: string[]; correctAnswer: number; points: number; topic: string }[];
}

export default function MockTestRunner() {
  const { testId } = useParams<{ testId: string }>();
  const { token } = useAuthStore();
  const navigate = useNavigate();

  const [test, setTest] = useState<MockTest | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Use refs for values needed inside async callbacks to avoid stale closures
  const violationsRef = useRef<ViolationEvent[]>([]);
  const answersRef = useRef<TestAnswer[]>([]);
  const testStartTimeRef = useRef<number>(0);
  const submittedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noFaceCountRef = useRef(0);

  // Keep answersRef in sync
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // ── Security: disable right-click / copy / paste ──────────────────────────
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('paste', block);
      document.body.style.userSelect = '';
    };
  }, []);

  // ── Submit (stable ref-based, no stale closures) ──────────────────────────
  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);

    const timeTaken = Math.round((Date.now() - testStartTimeRef.current) / 1000);
    try {
      await fetch(`${API}/api/mock-tests/${testId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: answersRef.current,
          timeTaken,
          violations: violationsRef.current,
        }),
      });
    } catch (e) {
      console.error('Submit failed:', e);
    } finally {
      // Cleanup webcam
      webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
      navigate(`/mock-tests/${testId}/results`);
    }
  }, [testId, token, navigate]);

  // ── Log violation ─────────────────────────────────────────────────────────
  const logViolation = useCallback((type: ViolationEvent['type']) => {
    const v: ViolationEvent = { type, timestamp: new Date().toISOString() };
    violationsRef.current = [...violationsRef.current, v];
    if (violationsRef.current.length >= 3) {
      doSubmit();
    }
  }, [doSubmit]);

  // ── Initialize test ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!testId || !token) return;

    const init = async () => {
      try {
        // 1. Fetch test
        const testRes = await fetch(`${API}/api/mock-tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!testRes.ok) throw new Error('Failed to load test');
        const testData: MockTest = await testRes.json();
        setTest(testData);

        // 2. Start attempt (ignore 409 = already started)
        await fetch(`${API}/api/mock-tests/${testId}/start`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        // 3. Fullscreen
        try {
          await document.documentElement.requestFullscreen();
        } catch { /* user may deny, that's ok */ }

        // 4. Webcam
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          webcamStreamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch { /* camera denied — continue without it */ }

        // 5. Face detection (non-blocking)
        loadFaceDetection();

        // 6. Timer
        const totalTime = testData.questionCount * 120;
        setTimeLeft(totalTime);
        testStartTimeRef.current = Date.now();
        setLoading(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to initialize test');
        setLoading(false);
      }
    };

    init();

    return () => {
      webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, token]);

  // ── Face detection ────────────────────────────────────────────────────────
  const loadFaceDetection = async () => {
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      // Start interval only after models are loaded
      faceIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const detections = await faceapi.detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          );
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
        } catch { /* ignore detection errors */ }
      }, 1000);
    } catch { /* models failed to load — continue without face detection */ }
  };

  // ── Fullscreen exit ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        logViolation('fullscreen_exit');
        setWarningMessage('You exited fullscreen! Please return to fullscreen.');
        setShowWarning(true);
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [logViolation]);

  // ── Tab switch ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onHide = () => { if (document.hidden && !submittedRef.current) logViolation('tab_switch'); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [logViolation]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!test || loading) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { doSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [test, loading, doSubmit]);

  // ── Answer selection ──────────────────────────────────────────────────────
  const handleAnswerSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => {
      const next = prev.find((a) => a.questionId === questionId)
        ? prev.map((a) => a.questionId === questionId ? { ...a, selectedOption: optionIndex } : a)
        : [...prev, { questionId, selectedOption: optionIndex }];
      answersRef.current = next;
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4" />
          <p className="text-lg font-black uppercase tracking-widest">Initializing Test...</p>
          <p className="text-sm text-textLight mt-2">Requesting camera & fullscreen access...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto" />
          <p className="text-red-400 text-lg font-black">{error}</p>
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

  if (!test) return null;

  const currentQuestion = test.questions[currentQuestionIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion.id);
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-background p-4">

      {/* Warning overlay */}
      {showWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-red-500/90 z-50 flex items-center justify-center"
        >
          <div className="text-center text-white p-8">
            <ExclamationTriangleIcon className="w-24 h-24 mx-auto mb-4" />
            <h2 className="text-3xl font-black uppercase mb-4">Warning!</h2>
            <p className="text-xl mb-4">{warningMessage}</p>
            <p className="text-lg mb-6">Violations: {violationsRef.current.length}/3</p>
            <button
              onClick={() => {
                setShowWarning(false);
                // Re-enter fullscreen if they exited
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              className="px-8 py-4 bg-white text-red-500 rounded-2xl font-black uppercase"
            >
              Continue Test
            </button>
          </div>
        </motion.div>
      )}

      {/* Webcam feed */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="relative w-[120px] h-[90px] bg-black rounded-lg overflow-hidden border-2 border-brand">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute top-1 right-1">
            <VideoCameraIcon className="w-4 h-4 text-brand" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">{test.name}</h1>
          <p className="text-textLight text-sm">{test.subject}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <ClockIcon className="w-5 h-5 text-brand" />
            <span className={`text-2xl font-black ${timeLeft <= 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <p className="text-xs text-textLight">Time Remaining</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-black text-textLight uppercase">
            Question {currentQuestionIndex + 1} of {test.questions.length}
          </span>
          <span className="text-xs font-black text-brand uppercase">{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
          <motion.div animate={{ width: `${progress}%` }} className="h-full bg-brand" transition={{ duration: 0.3 }} />
        </div>
      </div>

      {/* Question card */}
      <motion.div
        key={currentQuestionIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto glass-card p-8 space-y-6"
      >
        <h2 className="text-xl font-black text-white leading-tight">{currentQuestion.text}</h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleAnswerSelect(currentQuestion.id, index)}
              className={`w-full p-4 rounded-xl text-left font-bold transition-all border-2 ${
                currentAnswer?.selectedOption === index
                  ? 'bg-brand text-background border-brand'
                  : 'bg-surface border-white/10 text-white hover:border-brand/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  currentAnswer?.selectedOption === index ? 'bg-background border-background' : 'border-white/30'
                }`}>
                  {currentAnswer?.selectedOption === index && <div className="w-2 h-2 bg-brand rounded-full" />}
                </div>
                <span className="text-sm">{option}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto mt-6 flex gap-4">
        <button
          onClick={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))}
          disabled={currentQuestionIndex === 0}
          className="px-6 py-3 bg-surface border border-white/10 rounded-xl text-white font-black uppercase disabled:opacity-50"
        >
          Previous
        </button>
        {currentQuestionIndex < test.questions.length - 1 ? (
          <button
            onClick={() => setCurrentQuestionIndex((p) => p + 1)}
            className="flex-1 px-6 py-3 bg-brand text-background rounded-xl font-black uppercase"
          >
            Next Question
          </button>
        ) : (
          <button
            onClick={doSubmit}
            disabled={submitted}
            className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-black uppercase disabled:opacity-50"
          >
            {submitted ? 'Submitting...' : 'Submit Test'}
          </button>
        )}
      </div>

      {/* Violations counter */}
      {violationsRef.current.length > 0 && (
        <div className="fixed top-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg z-30">
          <p className="text-sm font-black">Violations: {violationsRef.current.length}/3</p>
        </div>
      )}
    </div>
  );
}
