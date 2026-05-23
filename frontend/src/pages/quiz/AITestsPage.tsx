import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  SparklesIcon,
  PlayIcon,
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowUpIcon,
  ArrowPathIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

const API = import.meta.env.VITE_API_URL ?? '/api';

interface QuizData {
  title: string;
  subject: string;
  questions: any[];
  timePerQuestion: number;
}

export default function AITestsPage() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    topics: '',
    count: 10,
    difficulty: 'medium',
    referenceId: '',
    referenceType: 'none',
    pattern: '',
  });

  const [localFile, setLocalFile] = useState<File | null>(null);
  const [references, setReferences] = useState<{ lectureNotes: any[]; samplePapers: any[] }>({
    lectureNotes: [],
    samplePapers: [],
  });
  const [lastQuiz, setLastQuiz] = useState<QuizData | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [histRes, refRes] = await Promise.all([
        fetch(`${API}/ai-quiz/history`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/ai-quiz/references`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (histRes.ok) setHistory(await histRes.json());
      if (refRes.ok) setReferences(await refRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append('subject', formData.subject);
    data.append('topics', formData.topics);
    data.append('count', formData.count.toString());
    data.append('difficulty', formData.difficulty);
    data.append('referenceId', formData.referenceId);
    data.append('referenceType', formData.referenceType);
    data.append('pattern', formData.pattern);
    if (localFile) data.append('file', localFile);

    try {
      const res = await fetch(`${API}/ai-quiz/generate-test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });
      if (!res.ok) throw new Error('Failed to generate quiz');
      const quiz = await res.json();
      setLastQuiz(quiz);
    } catch (err) {
      console.error('Failed to generate quiz:', err);
      alert('Failed to generate test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startTest = (quizToStart?: any) => {
    const data = quizToStart || lastQuiz;
    if (!data) return;
    navigate('/ai-tests/run', { state: { quiz: data, topics: formData.topics } });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-widest mb-4">
          <SparklesIcon className="w-4 h-4" />
          Advanced AI Assessment
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Personalized Quiz Suite</h1>
        <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
          Generate custom tests using your lecture materials, past papers, or specific question patterns.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Config Form */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleGenerate}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 space-y-5 relative overflow-hidden h-full"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <AdjustmentsHorizontalIcon className="w-24 h-24" />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. DBMS"
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-purple-500 outline-none transition-all"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Difficulty</label>
                  <select
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-purple-500 outline-none appearance-none"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Focus Topics</label>
                <input
                  type="text"
                  placeholder="e.g. Normalization, SQL"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-purple-500 outline-none transition-all"
                  value={formData.topics}
                  onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Reference Material
                </label>
                <select
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-purple-500 outline-none"
                  value={`${formData.referenceType}:${formData.referenceId}`}
                  onChange={(e) => {
                    const [type, id] = e.target.value.split(':');
                    setFormData({ ...formData, referenceType: type, referenceId: id || '' });
                  }}
                >
                  <option value="none:">Global AI Knowledge</option>
                  <optgroup label="Lecture Notes">
                    {references.lectureNotes.map((n) => (
                      <option key={n.id} value={`lecture:${n.id}`}>
                        {n.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Sample Papers">
                    {references.samplePapers.map((p) => (
                      <option key={p.id} value={`sample:${p.id}`}>
                        {p.subject} (Sample)
                      </option>
                    ))}
                  </optgroup>
                  <option value="local:upload">📁 Upload from Computer (PDF/Text)</option>
                </select>
              </div>

              {formData.referenceType === 'local' && (
                <div className="p-4 border-2 border-dashed border-white/10 rounded-xl bg-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                    <DocumentArrowUpIcon className="w-4 h-4" />
                    Universal File Upload
                  </div>
                  <input
                    type="file"
                    onChange={(e) => setLocalFile(e.target.files?.[0] || null)}
                    className="text-[10px] text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 cursor-pointer"
                  />
                  {localFile && (
                    <div className="flex items-center gap-2 text-[10px] text-purple-400/60 italic font-medium">
                      <DocumentIcon className="w-3 h-3" />
                      {localFile.name} ({(localFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Question Pattern (Optional)
                </label>
                <textarea
                  placeholder="e.g. 5 MCQs and 2 Short Descriptive Answers"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-purple-500 outline-none transition-all h-20 placeholder:text-white/20"
                  value={formData.pattern}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <SparklesIcon className="w-5 h-5" />
              )}
              {loading ? 'Generating...' : 'Generate Quiz'}
            </button>
          </form>
        </div>

        {/* Middle Column: Results Preview */}
        <div className="lg:col-span-1">
          {!lastQuiz && !loading ? (
            <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl h-full flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-60 min-h-[400px]">
              <div className="p-4 bg-white/5 rounded-full">
                <AcademicCapIcon className="w-12 h-12 text-white/20" />
              </div>
              <p className="text-gray-400 text-sm italic">Generate a quiz to preview questions.</p>
            </div>
          ) : loading ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl h-full flex flex-col items-center justify-center p-12 space-y-6 min-h-[400px]">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <div className="space-y-2 text-center">
                <p className="text-white font-bold animate-pulse">
                  {localFile ? 'Processing Document...' : 'Consulting AI Professor...'}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Analyzing context via Groq Llama 3</p>
              </div>
            </div>
          ) : (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-8 space-y-6 h-full">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <SparklesIcon className="w-5 h-5 text-purple-300" />
                </div>
                <span className="text-xs font-bold text-purple-300 uppercase tracking-[0.2em]">Ready for Assessment</span>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{lastQuiz?.title}</h2>
                <div className="flex gap-4">
                  <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[10px] uppercase font-bold text-purple-300">
                    {lastQuiz?.questions?.length || 0} Questions
                  </span>
                  <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] uppercase font-bold text-gray-400">
                    {formData.difficulty}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 opacity-30">Quick Samples</p>
                {lastQuiz?.questions?.slice(0, 2).map((q: any, i: number) => (
                  <div
                    key={i}
                    className="bg-white/5 border border-white/5 p-4 rounded-xl text-sm text-gray-300 italic leading-relaxed"
                  >
                    <span className="text-purple-300 inline-block mr-1 font-black">[{q.type}]</span> "{q.question}"
                  </div>
                ))}
                <p className="text-center text-[10px] text-gray-400/40 py-1">
                  ... + {(lastQuiz?.questions?.length || 2) - 2} more unique questions
                </p>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => startTest()}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-xl shadow-purple-500/20"
                >
                  <PlayIcon className="w-6 h-6" />
                  Start Strict Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: History */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Recent History</h2>
            <button
              onClick={fetchData}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-8 text-center text-gray-400 opacity-50">
                <p className="text-sm">No recent records yet.</p>
              </div>
            ) : (
              history.map((record, i) => (
                <div
                  key={i}
                  className={`bg-white/5 border border-white/5 rounded-2xl p-4 transition-all ${
                    record.status === 'DISQUALIFIED' ? 'border-red-500/10 bg-red-500/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white capitalize">{record.subject}</h4>
                      {record.status === 'DISQUALIFIED' && (
                        <span className="px-1.5 py-0.5 bg-red-400/20 text-red-400 text-[8px] font-black uppercase rounded border border-red-400/20">
                          Disqualified
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-md font-black ${record.status === 'DISQUALIFIED' ? 'text-red-400' : 'text-purple-400'}`}>
                        {record.score}/{record.maxScore}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 opacity-60 mb-4">
                    {new Date(record.assessmentDate).toLocaleDateString()} • {record.topic}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => record.details && setSelectedRecord(record)}
                      className="flex-1 py-1.5 text-[10px] bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10 transition-all font-medium"
                    >
                      Review
                    </button>
                    <button
                      onClick={() =>
                        startTest({
                          title: `Retry: ${record.subject}`,
                          subject: record.subject,
                          questions: record.details?.questions || [],
                          timePerQuestion: 60,
                        })
                      }
                      className="flex-1 py-1.5 text-[10px] bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded-lg border border-purple-500/20 transition-all font-medium"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedRecord(null)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <AcademicCapIcon className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white capitalize">{selectedRecord.subject}</h2>
                  <p className="text-xs text-gray-400 opacity-60">
                    {selectedRecord.topic} • {new Date(selectedRecord.assessmentDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-2xl font-black text-purple-400">
                    {selectedRecord.score}/{selectedRecord.maxScore}
                  </div>
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    {selectedRecord.status}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-white/40 hover:text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid gap-6">
                {selectedRecord.details?.questions?.map((q: any, i: number) => {
                  const userAnswer = selectedRecord.details?.userAnswers?.[i];
                  const correctAnswer = q.answer || q.correctAnswer || q.idealAnswer;
                  const isCorrect = q.type === 'MCQ' ? userAnswer === correctAnswer : !!userAnswer;

                  return (
                    <div
                      key={i}
                      className={`p-6 rounded-2xl border-l-4 bg-white/5 transition-all ${
                        isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <h4 className="text-white font-medium leading-relaxed">
                          <span className="text-white/20 mr-2 font-mono">
                            Q{i + 1}. <span className="text-purple-300 text-[10px]">[{q.type}]</span>
                          </span>
                          {q.question}
                        </h4>
                        <div
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                            isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {q.type === 'MCQ' ? (isCorrect ? 'Correct' : 'Incorrect') : 'Evaluated'}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Your Response</span>
                          <div
                            className={`p-3 rounded-xl border text-sm ${
                              q.type === 'MCQ'
                                ? isCorrect
                                  ? 'bg-green-500/10 border-green-500/20 text-green-300'
                                  : 'bg-red-500/10 border-red-500/20 text-red-300'
                                : 'bg-white/5 border-white/10 text-gray-300'
                            }`}
                          >
                            {userAnswer || 'No response recorded'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                            {q.type === 'MCQ' ? 'Correct Answer' : 'Ideal Suggestion'}
                          </span>
                          <div className="p-3 rounded-xl bg-white/5 border border-green-500/30 text-green-300 text-sm font-bold">
                            {correctAnswer}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-1 opacity-80">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          Explanation
                        </div>
                        <p className="text-xs text-gray-300 italic leading-relaxed">
                          {q.explanation || 'Analyzed from reference material.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unused icon references to prevent tree-shaking warnings */}
      <span className="hidden">
        <ExclamationTriangleIcon className="w-0 h-0" />
      </span>
    </div>
  );
}
