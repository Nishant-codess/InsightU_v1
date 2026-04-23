import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChartBarIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { useAuthStore } from '../../store/useAuthStore';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

interface TopicPerformance {
  topic: string;
  subject: string;
  averageScore: number;
  assessmentCount: number;
  status: 'strong' | 'weak' | 'neutral';
  recommendedNotes: string[];
}

interface PerformanceTrend {
  date: string;
  subject: string;
  score: number;
  assessmentType: string;
}

interface StudyRecommendation {
  topic: string;
  subject: string;
  reason: string;
  recommendedNotes: any[];
  priority: 'high' | 'medium' | 'low';
}

interface AnalyticsData {
  healthScore: number;
  weakSubjects: string[];
  weakTopics: TopicPerformance[];
  trends: PerformanceTrend[];
  recommendations: StudyRecommendation[];
}

function getHealthColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export default function PerformanceDetail() {
  const { user, token } = useAuthStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get('/api/student/analytics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-textLight">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-8 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-medium">{error || 'No analytics data available'}</p>
        </div>
      </div>
    );
  }

  const healthColor = getHealthColor(data.healthScore);
  const isAtRisk = data.healthScore < 60;

  const healthDoughnutData = {
    datasets: [
      {
        data: [data.healthScore, 100 - data.healthScore],
        backgroundColor: [healthColor, 'rgba(255,255,255,0.05)'],
        borderWidth: 0,
        cutout: '75%',
      },
    ],
  };

  const subjectBarData = {
    labels: data.weakSubjects.length > 0 ? data.weakSubjects : ['No weak subjects'],
    datasets: [
      {
        label: 'Score %',
        data: data.weakTopics
          .filter((t, i, arr) => arr.findIndex(x => x.subject === t.subject) === i)
          .map(t => t.averageScore),
        backgroundColor: 'var(--color-brand, #6366f1)',
        borderRadius: 6,
      },
    ],
  };

  const trendLineData = {
    labels: data.trends.map(t => new Date(t.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Score %',
        data: data.trends.map(t => t.score),
        borderColor: 'var(--color-brand, #6366f1)',
        backgroundColor: 'rgba(99,102,241,0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: 'var(--color-brand, #6366f1)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { min: 0, max: 100, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
    animation: { duration: 800 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-brand/10 rounded-2xl border border-brand/20">
          <ChartBarIcon className="w-8 h-8 text-brand" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Academic Health Analysis</h1>
          <p className="text-textLight">Detailed performance breakdown for {user?.name}</p>
        </div>
      </div>

      {/* Health Score + At Risk */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 flex flex-col items-center"
        >
          <div className="relative w-40 h-40">
            <Doughnut
              data={healthDoughnutData}
              options={{ responsive: true, plugins: { legend: { display: false }, tooltip: { enabled: false } } }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{Math.round(data.healthScore)}%</span>
              <span className="text-xs text-textLight">Health Score</span>
            </div>
          </div>
          {isAtRisk && (
            <span className="mt-3 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30">
              At Risk
            </span>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <p className="text-textLight text-sm font-medium mb-1">Weak Subjects</p>
          <p className="text-4xl font-bold text-brand">{data.weakSubjects.length}</p>
          <p className="text-xs text-textLight mt-2">subjects below 60% threshold</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <p className="text-textLight text-sm font-medium mb-1">Weak Topics</p>
          <p className="text-4xl font-bold text-purple-400">{data.weakTopics.length}</p>
          <p className="text-xs text-textLight mt-2">topics needing attention</p>
        </motion.div>
      </div>

      {/* Subject-wise bar chart */}
      {data.weakSubjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Subject Performance</h2>
          <Bar data={subjectBarData} options={chartOptions} />
        </motion.div>
      )}

      {/* Weak subjects cards */}
      {data.weakSubjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 bg-white/5">
            <h2 className="text-lg font-semibold text-white">Weak Subjects</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.weakSubjects.map((subject, i) => (
              <motion.div
                key={subject}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-center justify-between"
              >
                <span className="text-white font-medium text-sm">{subject}</span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30">
                  Weak
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Weak topics cards */}
      {data.weakTopics.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 bg-white/5">
            <h2 className="text-lg font-semibold text-white">Weak Topics</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.weakTopics.map((topic, i) => (
              <motion.div
                key={`${topic.subject}-${topic.topic}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5"
              >
                <p className="text-white font-medium text-sm">{topic.topic}</p>
                <p className="text-textLight text-xs mt-1">{topic.subject}</p>
                <p className="text-amber-400 text-xs mt-2">
                  {topic.recommendedNotes.length} note{topic.recommendedNotes.length !== 1 ? 's' : ''} available
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Performance trend line chart */}
      {data.trends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ArrowTrendingUpIcon className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-semibold text-white">Performance Trend</h2>
          </div>
          <Line data={trendLineData} options={chartOptions} />
        </motion.div>
      )}

      {/* Study recommendations */}
      {data.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5 text-brand" />
              <h2 className="text-lg font-semibold text-white">Recommended Study Areas</h2>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {data.recommendations.map((rec, i) => (
              <motion.div
                key={`${rec.subject}-${rec.topic}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-6 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-medium">{rec.topic}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityColors[rec.priority]}`}>
                        {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                      </span>
                    </div>
                    <p className="text-textLight text-sm">{rec.subject}</p>
                    <p className="text-textLight text-xs mt-1 opacity-70">{rec.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-brand text-sm font-medium">{rec.recommendedNotes.length} notes</p>
                    <p className="text-textLight text-xs">available</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
