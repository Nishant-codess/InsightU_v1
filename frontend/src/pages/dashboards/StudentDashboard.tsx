import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import {
  AcademicCapIcon,
  ClockIcon,
  CalendarIcon,
  ChartBarIcon,
  BookOpenIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { user, portalData } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'marks' | 'timetable'>('overview');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const profile = portalData?.profile || {};
  const timetable = portalData?.timetable || [];
  const attendance = portalData?.attendance || [];
  const marks = portalData?.marks || [];
  const studentName = profile.name || user?.student?.name || user?.name || 'STUDENT';
  const regNo = profile.registrationNumber || user?.student?.registrationNumber || user?.email;
  const sem = profile.semester || (user?.student?.year ? user.student.year * 2 : '?');
  const batchName = profile.batch || user?.student?.batch || '?';

  // Calculate overall attendance
  const overallAttendance = attendance.length > 0
    ? (attendance.reduce((sum, a) => sum + parseFloat(a.attendancePercent || '0'), 0) / attendance.length).toFixed(1)
    : null;

  // Subjects below 75%
  const lowAttendance = attendance.filter(a => parseFloat(a.attendancePercent) < 75);

  const noData = !portalData && !user?.student;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter">
            HELLO, {studentName.split(' ')[0].toUpperCase()}
          </h1>
          <p className="text-textLight mt-1 text-xs font-medium bg-white/5 w-fit px-3 py-1 rounded-full uppercase tracking-widest">
            {regNo} • Sem {sem} • Batch {batchName}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Clock */}
          <div className="flex flex-col items-center px-5 py-3 bg-surface/50 border border-white/10 rounded-2xl">
            <ClockIcon className="w-5 h-5 text-brand mb-1" />
            <p className="text-xl font-black text-white tabular-nums">
              {currentTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[9px] text-textLight uppercase tracking-widest">
              {currentTime.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>

          {/* Overall Attendance */}
          {overallAttendance && (
            <div className={`flex flex-col items-center px-5 py-3 rounded-2xl border ${parseFloat(overallAttendance) >= 75 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <AcademicCapIcon className={`w-5 h-5 mb-1 ${parseFloat(overallAttendance) >= 75 ? 'text-green-400' : 'text-red-400'}`} />
              <p className="text-xl font-black text-white">{overallAttendance}%</p>
              <p className="text-[9px] text-textLight uppercase tracking-widest">Avg Attendance</p>
            </div>
          )}
        </div>
      </div>

      {/* No data state */}
      {noData && (
        <div className="glass-card p-12 text-center">
          <ArrowPathIcon className="w-12 h-12 text-brand/30 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">No Portal Data</h2>
          <p className="text-textLight text-sm">Please log out and log back in with your SRM credentials to fetch your academic data.</p>
          <Link to="/login" className="mt-4 inline-block px-6 py-3 bg-brand text-background rounded-xl font-black text-sm uppercase tracking-widest">
            Re-Login
          </Link>
        </div>
      )}

      {/* Tabs */}
      {!noData && (
        <>
          <div className="flex gap-2 p-1.5 bg-surface/80 border border-white/5 w-fit rounded-2xl backdrop-blur-2xl">
            {(['overview', 'attendance', 'marks', 'timetable'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand text-background shadow-xl shadow-brand/20' : 'text-textLight hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-brand/10 rounded-xl"><UserIcon className="w-5 h-5 text-brand" /></div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Profile</h2>
                </div>
                <div className="space-y-3">
                  {[
                    ['Name', studentName],
                    ['Reg No', regNo],
                    ['Program', profile.program || 'B.Tech'],
                    ['Department', profile.department || user?.student?.department],
                    ['Semester', sem],
                    ['Batch', batchName],
                  ].map(([label, value]) => value ? (
                    <div key={label} className="flex justify-between items-start gap-2">
                      <span className="text-xs text-textLight uppercase tracking-wider shrink-0">{label}</span>
                      <span className="text-xs font-bold text-white text-right">{value}</span>
                    </div>
                  ) : null)}
                </div>
              </motion.div>

              {/* Attendance Summary */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-brand/10 rounded-xl"><ChartBarIcon className="w-5 h-5 text-brand" /></div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Attendance</h2>
                </div>
                {attendance.length === 0 ? (
                  <p className="text-textLight text-xs">No attendance data</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.slice(0, 6).map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white font-bold truncate">{a.courseTitle}</p>
                        </div>
                        <div className={`text-xs font-black px-2 py-0.5 rounded-lg shrink-0 ${parseFloat(a.attendancePercent) >= 75 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {a.attendancePercent}%
                        </div>
                      </div>
                    ))}
                    {attendance.length > 6 && (
                      <button onClick={() => setActiveTab('attendance')} className="text-xs text-brand font-bold mt-1">
                        +{attendance.length - 6} more →
                      </button>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Alerts */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/10 rounded-xl"><ExclamationTriangleIcon className="w-5 h-5 text-red-400" /></div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Alerts</h2>
                </div>
                {lowAttendance.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircleIcon className="w-5 h-5" />
                    <p className="text-xs font-bold">All subjects above 75%!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lowAttendance.map((a, i) => (
                      <div key={i} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                        <p className="text-xs font-black text-red-400">{a.attendancePercent}% — DANGER</p>
                        <p className="text-xs text-white mt-0.5 truncate">{a.courseTitle}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Today's Timetable */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 lg:col-span-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-brand/10 rounded-xl"><CalendarIcon className="w-5 h-5 text-brand" /></div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">Your Subjects</h2>
                  <span className="text-xs text-textLight">AY {timetable[0]?.academicYear || '2025-26-EVEN'}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {timetable.filter(c => !c.slot.startsWith('P') && !c.slot.startsWith('L')).map((course, i) => (
                    <div key={i} className="p-3 bg-surface/50 border border-white/5 rounded-xl hover:border-brand/30 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-brand uppercase">{course.slot}</span>
                        <span className="text-[9px] text-textLight">{course.room}</span>
                      </div>
                      <p className="text-xs font-bold text-white leading-tight">{course.courseTitle}</p>
                      <p className="text-[9px] text-textLight mt-1 truncate">{course.faculty.split('(')[0].trim()}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Attendance Details</h2>
                <p className="text-xs text-textLight mt-1">Overall Average: <span className="text-brand font-black">{overallAttendance}%</span></p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Course', 'Faculty', 'Slot', 'Conducted', 'Absent', 'Attendance'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-textLight uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-bold text-white">{a.courseTitle}</p>
                          <p className="text-[10px] text-textLight">{a.courseCode}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-textLight">{a.faculty.split('(')[0].trim()}</td>
                        <td className="px-4 py-3 text-xs font-bold text-brand">{a.slot}</td>
                        <td className="px-4 py-3 text-xs text-white">{a.hoursConducted}</td>
                        <td className="px-4 py-3 text-xs text-white">{a.hoursAbsent}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${parseFloat(a.attendancePercent) >= 75 ? 'bg-green-400' : 'bg-red-400'}`}
                                style={{ width: `${Math.min(parseFloat(a.attendancePercent), 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-black ${parseFloat(a.attendancePercent) >= 75 ? 'text-green-400' : 'text-red-400'}`}>
                              {a.attendancePercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* MARKS TAB */}
          {activeTab === 'marks' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {marks.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <BookOpenIcon className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-textLight text-sm">No marks data available yet</p>
                </div>
              ) : (
                marks.filter(m => m.tests.length > 0).map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-black text-brand uppercase tracking-widest">{m.courseCode}</p>
                        <p className="text-sm font-bold text-white mt-0.5">
                          {timetable.find(t => t.courseCode === m.courseCode)?.courseTitle || m.courseCode}
                        </p>
                      </div>
                      <span className="text-[10px] text-textLight bg-white/5 px-2 py-1 rounded-lg uppercase">{m.courseType}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {m.tests.map((test, j) => (
                        <div key={j} className="p-3 bg-surface/50 border border-white/5 rounded-xl">
                          <p className="text-[10px] font-black text-textLight uppercase tracking-wider">{test.name}</p>
                          <p className="text-lg font-black text-white mt-1">{test.scored}<span className="text-xs text-textLight">/{test.maxMarks}</span></p>
                          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand rounded-full"
                              style={{ width: `${(test.scored / test.maxMarks) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* TIMETABLE TAB */}
          {activeTab === 'timetable' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">My Timetable</h2>
                <p className="text-xs text-textLight mt-1">{timetable[0]?.academicYear || 'AY 2025-26 EVEN'}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['#', 'Course Code', 'Course Title', 'Type', 'Faculty', 'Slot', 'Room'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-textLight uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timetable.map((c, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3 text-xs text-textLight">{c.sno}</td>
                        <td className="px-4 py-3 text-xs font-black text-brand">{c.courseCode}</td>
                        <td className="px-4 py-3 text-xs font-bold text-white">{c.courseTitle}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-lg text-textLight">{c.courseType}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-textLight">{c.faculty.split('(')[0].trim()}</td>
                        <td className="px-4 py-3 text-xs font-black text-brand">{c.slot}</td>
                        <td className="px-4 py-3 text-xs text-textLight">{c.room || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Classroom & Whiteboard Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/classroom" className="glass-card p-5 hover:border-brand/30 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-xl group-hover:bg-brand/20 transition-colors">
              <AcademicCapIcon className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Classrooms</h3>
              <p className="text-xs text-textLight">Join or view your GCR classrooms</p>
            </div>
          </div>
        </Link>
        <Link to="/whiteboard" className="glass-card p-5 hover:border-brand/30 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/10 rounded-xl group-hover:bg-brand/20 transition-colors">
              <BookOpenIcon className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Whiteboards</h3>
              <p className="text-xs text-textLight">Code sharing sessions</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
