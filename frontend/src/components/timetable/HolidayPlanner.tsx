import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    CalendarDaysIcon,
    ShieldExclamationIcon,
    ShieldCheckIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/useAuthStore';

interface HolidayPlannerProps {
    schedule?: Record<string, any[]>;
}

interface RiskResult {
    workingDaysMissed: number;
    projectedAttendance: number;
    riskScore: number;
    noImpact: boolean;
}

function getRiskColor(score: number): string {
    if (score >= 8) return 'text-red-500';
    if (score >= 5) return 'text-yellow-400';
    return 'text-green-400';
}

function getBarColor(score: number): string {
    if (score >= 8) return 'bg-red-500';
    if (score >= 5) return 'bg-yellow-400';
    return 'bg-green-400';
}

export default function HolidayPlanner({ schedule: _schedule }: HolidayPlannerProps) {
    const { token } = useAuthStore();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [attended, setAttended] = useState('');
    const [total, setTotal] = useState('');
    const [riskData, setRiskData] = useState<RiskResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canSubmit = startDate && endDate && attended && total && !loading;

    const calculateRisk = async () => {
        if (!canSubmit) return;
        setLoading(true);
        setError('');
        setRiskData(null);
        try {
            const res = await axios.post(
                '/api/student/holiday-planner/risk',
                {
                    startDate,
                    endDate,
                    currentAttendance: {
                        attended: parseInt(attended, 10),
                        total: parseInt(total, 10),
                    },
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setRiskData(res.data);
        } catch (err) {
            setError('Could not calculate risk. Ensure the Academic Calendar has been uploaded.');
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setRiskData(null);
        setError('');
    };

    const isCritical = riskData && riskData.projectedAttendance < 75;
    const isDangerZone = riskData && riskData.riskScore >= 8;

    return (
        <div className="bg-surface/30 border border-white/5 p-6 rounded-2xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand/10 rounded-xl">
                        <CalendarDaysIcon className="w-6 h-6 text-brand" />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                        Vacation Risk Analyzer
                    </h2>
                </div>
                {riskData && (
                    <button
                        onClick={reset}
                        className="text-xs text-textLight hover:text-brand flex items-center gap-1 transition-colors"
                    >
                        <ArrowPathIcon className="w-3 h-3" /> Reset
                    </button>
                )}
            </div>

            {/* Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date Range */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-textLight uppercase tracking-widest">
                        Vacation Dates
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-textLight mb-1 block">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white text-sm focus:border-brand transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-textLight mb-1 block">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white text-sm focus:border-brand transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Attendance Inputs */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-textLight uppercase tracking-widest">
                        Current Attendance
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-textLight mb-1 block">Classes Attended</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="e.g. 45"
                                value={attended}
                                onChange={(e) => setAttended(e.target.value)}
                                className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white text-sm focus:border-brand transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-textLight mb-1 block">Total Classes Held</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="e.g. 60"
                                value={total}
                                onChange={(e) => setTotal(e.target.value)}
                                className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white text-sm focus:border-brand transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={calculateRisk}
                disabled={!canSubmit}
                className="w-full py-3 bg-brand text-background font-bold rounded-lg text-sm transition-all hover:scale-[1.02] shadow-lg shadow-brand/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Calculating...' : 'Calculate Risk'}
            </button>

            {/* Error */}
            {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
            )}

            {/* Results */}
            <AnimatePresence>
                {riskData && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="space-y-4"
                    >
                        {/* No Impact Message */}
                        {riskData.noImpact && (
                            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                <ShieldCheckIcon className="w-5 h-5 text-green-400 shrink-0" />
                                <p className="text-sm text-green-300">
                                    Your vacation falls entirely on non-working days — no impact on attendance!
                                </p>
                            </div>
                        )}

                        {/* Danger Zone Banner */}
                        {isDangerZone && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-3 p-4 bg-red-600/20 border border-red-500/40 rounded-xl"
                            >
                                <ShieldExclamationIcon className="w-5 h-5 text-red-400 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-red-400">⚠ Danger Zone</p>
                                    <p className="text-xs text-red-300/80 mt-0.5">
                                        Risk score is critically high. This vacation will severely impact your attendance.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Critical Attendance Warning */}
                        {isCritical && (
                            <motion.div
                                animate={{ x: [0, -6, 6, -4, 4, 0] }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="flex items-center gap-3 p-4 bg-red-500/15 border border-red-500/30 rounded-xl"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.15, 1] }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0" />
                                </motion.div>
                                <div>
                                    <p className="text-sm font-bold text-red-400">Critical Attendance Warning</p>
                                    <p className="text-xs text-red-300/80 mt-0.5">
                                        Projected attendance will drop below 75% — you may be barred from exams.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-surface/50 border border-white/5 rounded-xl p-4 text-center">
                                <p className="text-[10px] text-textLight uppercase tracking-widest mb-1">
                                    Working Days Missed
                                </p>
                                <p className="text-2xl font-black text-white">{riskData.workingDaysMissed}</p>
                            </div>
                            <div className="bg-surface/50 border border-white/5 rounded-xl p-4 text-center">
                                <p className="text-[10px] text-textLight uppercase tracking-widest mb-1">
                                    Projected Attendance
                                </p>
                                <p className={`text-2xl font-black ${isCritical ? 'text-red-400' : 'text-green-400'}`}>
                                    {riskData.projectedAttendance.toFixed(1)}%
                                </p>
                            </div>
                            {/* Risk Score Gauge */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.15, type: 'spring', stiffness: 200 }}
                                className="bg-surface/50 border border-white/5 rounded-xl p-4 text-center"
                            >
                                <p className="text-[10px] text-textLight uppercase tracking-widest mb-1">
                                    Survival Risk Score
                                </p>
                                <p className={`text-2xl font-black ${getRiskColor(riskData.riskScore)}`}>
                                    {riskData.riskScore}<span className="text-sm font-normal text-textLight">/10</span>
                                </p>
                            </motion.div>
                        </div>

                        {/* Risk Score Progress Bar */}
                        {!riskData.noImpact && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] text-textLight">
                                    <span>Risk Level</span>
                                    <span className={getRiskColor(riskData.riskScore)}>
                                        {riskData.riskScore >= 8 ? 'Critical' : riskData.riskScore >= 5 ? 'Moderate' : 'Low'}
                                    </span>
                                </div>
                                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full rounded-full ${getBarColor(riskData.riskScore)}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(riskData.riskScore / 10) * 100}%` }}
                                        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                                    />
                                </div>
                                <div className="flex justify-between text-[9px] text-white/20">
                                    <span>0</span>
                                    <span>5</span>
                                    <span>10</span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
