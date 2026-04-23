/**
 * /mock-tests/create
 * AI-powered mock test creation page.
 * Step 1: Configure test metadata + upload PDFs → generate questions
 * Step 2: Review / edit / delete / regenerate questions
 * Step 3: Finalize (save) and optionally assign to a section
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentArrowUpIcon,
  SparklesIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/useAuthStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  topic: string;
  points: number;
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type Step = 'configure' | 'review' | 'assign';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function apiFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Handle both { message } and { error } and { status, message } shapes
    const msg =
      body.message ??
      (typeof body.error === 'string' ? body.error : body.error?.message) ??
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return res.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestionCard({
  q,
  index,
  onEdit,
  onDelete,
  onRegenerate,
  regenerating,
}: {
  q: Question;
  index: number;
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
  onRegenerate: (id: string) => void;
  regenerating: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card p-5 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full shrink-0">
            Q{index + 1}
          </span>
          <p className="text-sm text-white font-medium leading-snug">{q.text}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onRegenerate(q.id)}
            disabled={regenerating}
            title="Regenerate"
            className="p-1.5 rounded-lg text-textLight hover:text-brand hover:bg-brand/10 transition-colors disabled:opacity-40"
          >
            <ArrowPathIcon className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onEdit(q)}
            title="Edit"
            className="p-1.5 rounded-lg text-textLight hover:text-white hover:bg-white/10 transition-colors"
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(q.id)}
            title="Delete"
            className="p-1.5 rounded-lg text-textLight hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {q.options.map((opt, i) => (
          <div
            key={i}
            className={`text-xs px-3 py-2 rounded-lg border ${
              i === q.correctAnswer
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-white/5 bg-surface/50 text-textLight'
            }`}
          >
            <span className="font-bold mr-1">{String.fromCharCode(65 + i)}.</span>
            {opt}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-textLight">
        <span className="bg-surface/50 px-2 py-0.5 rounded-full">{q.topic}</span>
        <span>{q.points} pts</span>
      </div>
    </motion.div>
  );
}

function EditQuestionModal({
  q,
  onSave,
  onClose,
}: {
  q: Question;
  onSave: (q: Question) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Question>({ ...q });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Edit Question</h3>
          <button onClick={onClose} className="text-textLight hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-textLight uppercase tracking-widest">
            Question Text
          </label>
          <textarea
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            rows={3}
            className="w-full bg-surface/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {draft.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => setDraft({ ...draft, correctAnswer: i })}
              className={`w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
                draft.correctAnswer === i
                  ? 'border-green-500 bg-green-500'
                  : 'border-white/20 hover:border-green-500/50'
              }`}
            />
            <input
              value={opt}
              onChange={(e) => {
                const opts = [...draft.options];
                opts[i] = e.target.value;
                setDraft({ ...draft, options: opts });
              }}
              className="flex-1 bg-surface/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Topic"
            value={draft.topic}
            onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
          />
          <Input
            label="Points"
            type="number"
            value={draft.points}
            onChange={(e) => setDraft({ ...draft, points: parseInt(e.target.value, 10) || 10 })}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={() => onSave(draft)}>
            Save
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MockTestCreate() {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState<Step>('configure');

  // Configure step
  const [testName, setTestName] = useState('');
  const [subject, setSubject] = useState('');
  const [topicsInput, setTopicsInput] = useState('');
  const [questionCount, setQuestionCount] = useState(20);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review step
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Assign step (teacher only)
  const [assignedSection, setAssignedSection] = useState('');
  const [assignedYear, setAssignedYear] = useState('');
  const [assignedDept, setAssignedDept] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isTeacher = user?.role === 'TEACHER';

  // ── File drop zone ──────────────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type === 'application/pdf');
    setPdfFiles((prev) => [...prev, ...files].slice(0, 5));
  }, []);

  // ── Generate questions ──────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!testName.trim()) { setError('Test name is required'); return; }
    if (!subject.trim()) { setError('Subject is required'); return; }
    if (!topicsInput.trim()) { setError('At least one topic is required'); return; }
    if (pdfFiles.length === 0) { setError('Upload at least one PDF'); return; }

    setError('');
    setLoading(true);

    try {
      const form = new FormData();
      pdfFiles.forEach((f) => form.append('pdfs', f));
      form.append('count', String(questionCount));
      form.append('difficulty', difficulty);
      topicsInput.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) =>
        form.append('topics', t)
      );

      const data = await apiFetch('/api/mock-tests/generate', token!, {
        method: 'POST',
        body: form,
      });

      setQuestions(data.questions);
      setStep('review');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      if (msg.includes('NO_AI_CONFIG')) {
        setError('No AI provider configured. Go to Profile → AI Provider Settings to add your API key.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Regenerate single question ──────────────────────────────────────────────

  const handleRegenerate = async (id: string) => {
    setRegeneratingId(id);
    try {
      const form = new FormData();
      pdfFiles.forEach((f) => form.append('pdfs', f));
      form.append('count', '1');
      form.append('difficulty', difficulty);
      topicsInput.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) =>
        form.append('topics', t)
      );

      const data = await apiFetch('/api/mock-tests/generate', token!, {
        method: 'POST',
        body: form,
      });

      if (data.questions?.length > 0) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...data.questions[0], id } : q))
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setRegeneratingId(null);
    }
  };

  // ── Save / finalize ─────────────────────────────────────────────────────────

  const handleFinalize = async () => {
    if (questions.length === 0) { setError('Add at least one question'); return; }
    setSaving(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        name: testName,
        subject,
        topics: topicsInput.split(',').map((t) => t.trim()).filter(Boolean),
        questions,
        difficulty,
      };

      if (isTeacher && assignedSection) {
        body.assignedSection = assignedSection;
        body.assignedYear = assignedYear ? parseInt(assignedYear, 10) : undefined;
        body.assignedDept = assignedDept || undefined;
        body.windowStart = windowStart || undefined;
        body.windowEnd = windowEnd || undefined;
      }

      const saved = await apiFetch('/api/mock-tests', token!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Navigate to the test runner so the user can take it immediately
      navigate(`/mock-tests/${saved.id}/take`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SparklesIcon className="w-7 h-7 text-brand" />
        <div>
          <h1 className="text-2xl font-bold text-white">AI Mock Test Generator</h1>
          <p className="text-sm text-textLight">Upload study PDFs and let AI generate questions for you</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {(['configure', 'review', 'assign'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold transition-colors ${
                step === s
                  ? 'bg-brand text-background'
                  : ['review', 'assign'].indexOf(s) <= ['configure', 'review', 'assign'].indexOf(step)
                  ? 'bg-brand/30 text-brand'
                  : 'bg-surface text-textLight'
              }`}
            >
              {i + 1}
            </div>
            <span className={step === s ? 'text-white font-medium' : 'text-textLight'}>
              {s === 'configure' ? 'Configure' : s === 'review' ? 'Review' : 'Finalize'}
            </span>
            {i < 2 && <div className="w-8 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
          >
            <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto shrink-0">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step 1: Configure ── */}
      {step === 'configure' && (
        <div className="space-y-5">
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-textLight uppercase tracking-widest">Test Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Test Name"
                placeholder="e.g. Unit 3 Mock Test"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
              />
              <Input
                label="Subject"
                placeholder="e.g. Data Structures"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <Input
              label="Topics (comma-separated)"
              placeholder="e.g. Trees, Graphs, Sorting"
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
            />
          </div>

          <div className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-textLight uppercase tracking-widest">Generation Settings</h2>

            {/* Question count slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-textLight">Number of Questions</span>
                <span className="text-brand font-bold">{questionCount}</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                className="w-full accent-brand"
              />
              <div className="flex justify-between text-xs text-textLight">
                <span>10</span>
                <span>100</span>
              </div>
            </div>

            {/* Difficulty selector */}
            <div className="space-y-2">
              <span className="text-sm text-textLight">Difficulty</span>
              <div className="flex gap-2">
                {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      difficulty === d
                        ? d === 'EASY'
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : d === 'MEDIUM'
                          ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                          : 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-surface/50 border-white/10 text-textLight hover:border-white/20'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PDF upload zone */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-textLight uppercase tracking-widest">Source PDFs</h2>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-colors"
            >
              <DocumentArrowUpIcon className="w-10 h-10 text-textLight mx-auto mb-3" />
              <p className="text-sm text-white font-medium">Drop PDFs here or click to browse</p>
              <p className="text-xs text-textLight mt-1">Up to 5 PDFs, 20 MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPdfFiles((prev) => [...prev, ...files].slice(0, 5));
                }}
              />
            </div>

            {pdfFiles.length > 0 && (
              <div className="space-y-2">
                {pdfFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface/50 border border-white/5"
                  >
                    <span className="text-sm text-white truncate">{f.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFiles((prev) => prev.filter((_, j) => j !== i));
                      }}
                      className="text-textLight hover:text-red-400 ml-2 shrink-0"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            className="w-full"
            size="lg"
            isLoading={loading}
            onClick={handleGenerate}
          >
            <SparklesIcon className="w-5 h-5 mr-2" />
            Generate Questions with AI
          </Button>
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-textLight">
              {questions.length} question{questions.length !== 1 ? 's' : ''} generated
            </p>
            <Button variant="ghost" size="sm" onClick={() => setStep('configure')}>
              ← Back
            </Button>
          </div>

          <AnimatePresence mode="popLayout">
            {questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                q={q}
                index={i}
                onEdit={setEditingQ}
                onDelete={(id) => setQuestions((prev) => prev.filter((q) => q.id !== id))}
                onRegenerate={handleRegenerate}
                regenerating={regeneratingId === q.id}
              />
            ))}
          </AnimatePresence>

          <Button
            className="w-full"
            size="lg"
            onClick={() => setStep('assign')}
            disabled={questions.length === 0}
          >
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            Finalize Test →
          </Button>
        </div>
      )}

      {/* ── Step 3: Assign / Save ── */}
      {step === 'assign' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Finalize Test</h2>
            <Button variant="ghost" size="sm" onClick={() => setStep('review')}>
              ← Back
            </Button>
          </div>

          <div className="glass-card p-5 space-y-2">
            <p className="text-sm text-textLight">Test summary</p>
            <p className="text-white font-bold">{testName}</p>
            <div className="flex gap-3 text-xs text-textLight">
              <span>{subject}</span>
              <span>·</span>
              <span>{questions.length} questions</span>
              <span>·</span>
              <span>{difficulty}</span>
            </div>
          </div>

          {isTeacher && (
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-textLight uppercase tracking-widest">
                Assign to Section (optional)
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Section"
                  placeholder="e.g. A"
                  value={assignedSection}
                  onChange={(e) => setAssignedSection(e.target.value)}
                />
                <Input
                  label="Year"
                  type="number"
                  placeholder="e.g. 2"
                  value={assignedYear}
                  onChange={(e) => setAssignedYear(e.target.value)}
                />
                <Input
                  label="Department"
                  placeholder="e.g. CSE"
                  value={assignedDept}
                  onChange={(e) => setAssignedDept(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Available From"
                  type="datetime-local"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                />
                <Input
                  label="Available Until"
                  type="datetime-local"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          <Button className="w-full" size="lg" isLoading={saving} onClick={handleFinalize}>
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            Save Mock Test
          </Button>
        </div>
      )}

      {/* Edit question modal */}
      <AnimatePresence>
        {editingQ && (
          <EditQuestionModal
            q={editingQ}
            onSave={(updated) => {
              setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
              setEditingQ(null);
            }}
            onClose={() => setEditingQ(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
