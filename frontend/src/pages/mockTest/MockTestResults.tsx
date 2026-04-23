import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

interface TestResult {
  studentId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  timeTaken: number;
  violations: Record<string, number>;
  totalViolations: number;
  flagged: boolean;
  submittedAt: Date | null;
}

export default function MockTestResults() {
  const { testId } = useParams<{ testId: string }>();
  const { token, user } = useAuthStore();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!testId || !token) return;

    const fetchData = async () => {
      try {
        const testRes = await fetch(`${API}/api/mock-tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!testRes.ok) throw new Error('Failed to load test');
        setTest(await testRes.json());

        // Teachers see all results; students only see their own attempt via the same endpoint
        if (isTeacher) {
          const resultsRes = await fetch(`${API}/api/mock-tests/${testId}/results`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resultsRes.ok) setResults(await resultsRes.json());
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [testId, token, isTeacher]);

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  const violationLabel = (type: string) =>
    ({ fullscreen_exit: 'Fullscreen Exit', tab_switch: 'Tab Switch', face_not_detected: 'Face Not Detected' }[type] ?? type);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4" />
          <p className="text-lg font-black uppercase tracking-widest">Loading Results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg font-black">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-brand text-background rounded-2xl font-black uppercase">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!test) return null;

  // Student view — just show a completion screen
  if (!isTeacher) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-10 text-center max-w-md w-full space-y-6"
        >
          <CheckCircleIcon className="w-20 h-20 text-green-400 mx-auto" />
          <h1 className="text-3xl font-black text-white uppercase">Test Submitted!</h1>
          <p className="text-textLight">{test.name}</p>
          <p className="text-sm text-textLight">Your answers have been recorded. Your teacher will share results soon.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-6 py-3 bg-brand text-background rounded-xl font-black uppercase"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // Teacher view — full results table
  const avgScore = results.length > 0 ? results.reduce((s, r) => s + r.percentage, 0) / results.length : 0;
  const flaggedCount = results.filter((r) => r.flagged).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-textLight hover:text-white mb-4 transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-bold">Back to Dashboard</span>
          </button>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{test.name}</h1>
          <p className="text-textLight">{test.subject} · {test.questionCount} Questions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Average Score', value: `${avgScore.toFixed(1)}%`, icon: ChartBarIcon, color: 'text-brand' },
            { label: 'Submissions', value: results.length, icon: ChartBarIcon, color: 'text-green-400' },
            { label: 'Flagged', value: flaggedCount, icon: ExclamationTriangleIcon, color: 'text-red-400' },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <Icon className={`w-6 h-6 ${color}`} />
                <h3 className="text-xs font-black text-textLight uppercase tracking-widest">{label}</h3>
              </div>
              <p className="text-4xl font-black text-white">{value}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-black text-white uppercase">Student Results</h2>
          </div>
          {results.length === 0 ? (
            <div className="p-12 text-center text-textLight">No submissions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface/50">
                  <tr>
                    {['Student ID', 'Score', 'Time Taken', 'Violations', 'Status'].map((h) => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-black text-textLight uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {results.map((r, i) => (
                    <motion.tr key={r.studentId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                      className={`hover:bg-surface/30 transition-colors ${r.flagged ? 'bg-red-500/10' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{r.studentId}</span>
                          {r.flagged && <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-black text-lg">{r.percentage.toFixed(1)}%</p>
                        <p className="text-textLight text-xs">{r.score}/{r.totalPoints} pts</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="w-4 h-4 text-textLight" />
                          <span className="text-white font-bold">{formatTime(r.timeTaken)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`font-black text-lg ${r.totalViolations >= 3 ? 'text-red-400' : r.totalViolations > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {r.totalViolations}
                        </p>
                        {r.totalViolations > 0 && (
                          <div className="text-xs text-textLight mt-1 space-y-0.5">
                            {Object.entries(r.violations).map(([type, count]) => (
                              <div key={type}>{violationLabel(type)}: {count}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {r.flagged
                          ? <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-black uppercase">Flagged</span>
                          : <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-black uppercase">Clean</span>
                        }
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
