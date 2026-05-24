import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  CalendarCheck,
  BookOpen,
  CreditCard,
  GraduationCap,
  CalendarPlus,
  Quote,
  Hash,
  Sparkles,
  Loader2,
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import MarkAttendanceWizard from "../components/MarkAttendanceWizard";

import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import UserAvatar from "../components/UserAvatar";
import { api } from "../services/api";
import { useSemesterManager } from "../hooks/useSemesterManager";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { userData, isDark } = useAuth();
  const { dashboardData, dashboardLoading: loading, dashboardError: error, fetchDashboard, invalidateDashboard } = useData();
  const [showWizard, setShowWizard] = useState(false);
  const [todayThought, setTodayThought] = useState(null);
  const [perfectDayLoading, setPerfectDayLoading] = useState(false);
  
  const { notification: semesterNotification, dismissNotification } = useSemesterManager();

  const handleRetry = useCallback(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  const handleWizardComplete = useCallback(() => {
    invalidateDashboard();
    fetchDashboard(true, false);
  }, [invalidateDashboard, fetchDashboard]);

  const handlePerfectDay = async () => {
    if (perfectDayLoading) return;
    setPerfectDayLoading(true);
    try {
      const { data: lectures } = await api.getTodayLectures();
      if (!lectures || lectures.length === 0) {
        setPerfectDayLoading(false);
        return;
      }
      const todayISO = new Date().toISOString().split("T")[0];
      const processedSubjects = new Set();
      
      for (const lecture of lectures) {
        if (lecture.subjectId && processedSubjects.has(lecture.subjectId)) continue;
        
        const res = await api.markAttendance({
          date: todayISO,
          status: "PRESENT",
          timetableSlotId: lecture.slotId,
          subjectId: lecture.subjectId || null,
        });
        
        if (lecture.subjectId && !res.error) {
           processedSubjects.add(lecture.subjectId);
        }
      }
      
      invalidateDashboard();
      fetchDashboard(true, false);
    } catch (e) {
      console.error(e);
    }
    setPerfectDayLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
    const fetchThought = async () => {
      const { data } = await api.getTodayThought();
      if (data) setTodayThought(data);
    };
    fetchThought();
  }, [fetchDashboard]);

  const attendance = dashboardData?.attendance;
  const attendanceData = useMemo(() => 
    (dashboardData?.subjects || []).map((s) => ({
      subject: s.name,
      percentage: s.attendancePercentage || 0,
    })),
    [dashboardData?.subjects]
  );

  // Month names for attendance comparison
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const currentMonthName = monthNames[new Date().getMonth()];
  const lastMonthName = monthNames[(new Date().getMonth() - 1 + 12) % 12];

  // Chart data from dashboard response (fallback to empty)
  const monthlyExpensesData = useMemo(() => [
    { name: "This Month", amount: dashboardData?.expenses?.totalSpentThisMonth || 0 },
  ], [dashboardData?.expenses?.totalSpentThisMonth]);

  const marksData = useMemo(() => dashboardData?.marks ? [
    { name: "CGPA", value: dashboardData.marks.cgpa || 0 },
    { name: "Current SGPA", value: dashboardData.marks.currentSgpa || 0 },
  ] : [], [dashboardData?.marks]);

  const tasks = dashboardData?.tasks;

  if (loading) return <LoadingSpinner message="Loading dashboard..." fullPage showColdStartMsg />;
  if (error) return <ErrorMessage message={error} onRetry={handleRetry} />;

  const minAttendanceCap = parseInt(localStorage.getItem("minAttendanceCap") || "75", 10);
  const fees = dashboardData?.fees;
  const assignments = dashboardData?.assignments;
  const todos = dashboardData?.todos;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your academic performance and activities."
      />

      {/* SEMESTER ALERT BANNER */}
      <SemesterAlertBanner notification={semesterNotification} onDismiss={dismissNotification} />


      {/* Welcome Card with User Info */}
      {userData && (
        <div className="w-full rounded-3xl bg-gradient-to-br from-brand/5 via-accent/5 to-purple-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm overflow-hidden relative group/card">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-brand/5 dark:bg-brand/10 rounded-full blur-3xl transition-all group-hover/card:scale-110 duration-700" />
          
          <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
            <UserAvatar 
              name={userData.name || userData.fullName} 
              userId={userData.userId} 
              className="h-16 w-16 text-lg ring-4 ring-white dark:ring-slate-800 shadow-md" 
            />
            <div className="flex-1 w-full">
              <div className="flex flex-col lg:flex-row justify-between gap-8">
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      Welcome back, {userData.name || userData.fullName || "Student"} !
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xl">
                      Take a gentle moment to mark your attendance for today. Your progress matters! 
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-x-4 sm:gap-x-8 gap-y-3 sm:gap-y-5 mt-3">

                    {userData.semester && (
                      <div className="flex items-center gap-3 sm:gap-5 bg-white/50 dark:bg-slate-800/30 px-4 sm:px-8 py-3 sm:py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm transition-all hover:shadow-md hover:bg-white/80 dark:hover:bg-slate-800/50 w-fit min-w-0 sm:min-w-[190px]">
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex-shrink-0">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">Semester</p>
                          <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">Sem {userData.semester}</p>
                        </div>
                      </div>
                    )}
                    {dashboardData?.subjects && (
                      <div className="flex items-center gap-3 sm:gap-5 bg-white/50 dark:bg-slate-800/30 px-4 sm:px-8 py-3 sm:py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm transition-all hover:shadow-md hover:bg-white/80 dark:hover:bg-slate-800/50 w-fit min-w-0 sm:min-w-[190px]">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex-shrink-0">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">Total Subjects</p>
                          <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{dashboardData.subjects.length}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mark Attendance Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      onClick={() => setShowWizard(true)}
                      className="group/btn inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm sm:text-base font-bold shadow-xl shadow-indigo-500/20 active:scale-[0.97] transition-all"
                    >
                      <CalendarPlus className="h-5 w-5 transition-transform group-hover/btn:rotate-12" />
                      Mark Attendance
                    </button>
                    <button
                      onClick={handlePerfectDay}
                      disabled={perfectDayLoading}
                      className="group/pbtn inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 text-sm sm:text-base font-bold border border-indigo-100 dark:border-slate-700 shadow-sm active:scale-[0.97] transition-all disabled:opacity-50"
                    >
                      {perfectDayLoading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" /> : <Sparkles className="h-5 w-5 transition-transform group-hover/pbtn:scale-110" />}
                      Perfect Day
                    </button>
                  </div>
                </div>

                {todayThought && (
                  <div className="lg:w-80 xl:w-96 flex-shrink-0 flex items-center">
                    <div className="w-full p-6 rounded-3xl bg-white/70 dark:bg-slate-800/60 border border-brand/10 dark:border-brand-400/20 shadow-sm backdrop-blur-md relative overflow-hidden group/thought">
                      {/* Decorative thought accent */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 dark:bg-brand-400/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover/thought:bg-brand/10 dark:group-hover/thought:bg-brand-400/10 transition-colors" />
                      
                      <div className="flex items-start gap-4 relative z-10">
                        <Quote className="h-8 w-8 text-brand/30 dark:text-brand-400/60 mt-0.5 flex-shrink-0 transition-transform group-hover/thought:scale-110" />
                        <div className="flex flex-col">
                          <p className="text-base italic font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                            "{todayThought.text}"
                          </p>
                          <div className="flex items-center justify-end gap-3 mt-4">
                            <span className="text-xs font-extrabold tracking-wide text-brand dark:text-brand-400 uppercase">~ {todayThought.author}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Attendance Wizard Modal */}
      <MarkAttendanceWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
      />

      {/* Dashboard Bento Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Stats & Charts) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <motion.div 
              whileHover={{ y: -5, scale: 1.02 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => navigate('/schedule')}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 cursor-pointer transition-transform duration-200 h-full flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                  <CalendarCheck size={24} />
                </div>
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Attendance</div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2">
                  <div>
                    <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-50">
                      {Math.round(attendance?.attendancePercentage || 0)}%
                    </div>
                    <div className="text-base text-slate-500 mt-1">
                      {attendance?.presentDays || 0} / {attendance?.totalWorkingDays || 0} lectures attended
                    </div>
                  </div>
                  {attendance?.lastMonthPercentage !== undefined && (
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg whitespace-normal ${
                      attendance.attendancePercentage >= attendance.lastMonthPercentage 
                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {attendance.attendancePercentage >= attendance.lastMonthPercentage ? '↑' : '↓'} 
                      {Math.abs(Math.round(attendance.attendancePercentage - attendance.lastMonthPercentage))}%
                      <span className="ml-1 font-normal opacity-80">{currentMonthName} vs {lastMonthName}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${attendance?.attendancePercentage || 0}%` }}
                    className="h-full bg-slate-400 dark:bg-slate-600"
                  />
                </div>
              </div>
            </motion.div>

            <StatsCard
              title="Tasks"
              value={String(tasks?.pendingTasks || 0)}
              icon={BookOpen}
              description={`Assignments: ${assignments?.submittedAssignments || 0} completed out of ${assignments?.totalAssignments || 0}\nTo-dos: ${todos?.completedTodos || 0} completed out of ${todos?.totalTodos || 0}`}
              color="brand"
              onClick={() => navigate('/tasks')}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
            {/* Subject-wise Attendance Chart */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Subject Attendance
                </h3>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis</div>
              </div>
              
              <div className="h-64 w-full flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={attendanceData} margin={{ bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                    <XAxis 
                      dataKey="subject" 
                      axisLine={false} 
                      tickLine={false} 
                      interval={0}
                      tickMargin={8}
                      tick={(props) => {
                        const words = props.payload.value.split(" ");
                        return (
                          <g transform={`translate(${props.x},${props.y + 8})`}>
                            <text x={0} y={0} dy={0} textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'} fontSize={10}>
                              {words.map((word, index) => (
                                <tspan key={index} x={0} dy={index === 0 ? 0 : 12}>{word}</tspan>
                              ))}
                            </text>
                          </g>
                        );
                      }}
                    />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ 
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                      }}
                      itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                      labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
                      formatter={(value) => [`${value}%`, 'Attendance']}
                    />
                    <ReferenceLine y={minAttendanceCap} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: `${minAttendanceCap}% Min`, fill: '#f43f5e', fontSize: 10 }} />
                    <Bar 
                      dataKey="percentage" 
                      radius={[6, 6, 0, 0]} 
                      barSize={40}
                    >
                      {attendanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.percentage >= minAttendanceCap ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Expenses Chart */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Expense History
                </h3>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  ₹{(dashboardData?.expenses?.totalSpentThisMonth || 0).toLocaleString()}
                  <span className="text-xs font-normal text-slate-500 ml-2">this month</span>
                </div>
              </div>
              
              <div className="h-64 w-full flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData?.expenses?.monthlyHistory || []}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ stroke: isDark ? '#334155' : '#e2e8f0', strokeWidth: 1, strokeDasharray: '3 3' }}
                      contentStyle={{ 
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                      }}
                      itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                      labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
                      formatter={(value) => [`₹${value.toLocaleString()}`, 'Spent']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#0ea5e9" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorAmount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Academic Performance) */}
        <div className="xl:col-span-1">
          <div className="h-full rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 flex flex-col">
            <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-slate-100">
              Academic Performance
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Your overall progress overview
            </p>
            <div className="flex-1 flex flex-col items-center justify-center py-4 gap-8">
              <div className="text-center w-full">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">CGPA</p>
                <div className="relative h-40 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "CGPA", value: (dashboardData?.marks?.cgpa || 0) },
                          { name: "Remaining", value: 10 - (dashboardData?.marks?.cgpa || 0) }
                        ]}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell key="cell-0" fill="#8b5cf6" />
                        <Cell key="cell-1" fill={isDark ? '#334155' : '#f1f5f9'} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                    <p className="text-4xl font-black text-brand dark:text-white tracking-tighter">
                      {((dashboardData?.marks?.cgpa) || 0).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">out of 10</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full text-center mt-2">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Current SGPA</p>
                  <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                    {((dashboardData?.marks?.currentSgpa) || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Subjects</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {dashboardData?.marks?.totalSubjects || 0}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full text-center">
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20">
                  <p className="text-xs font-medium text-red-600/70 dark:text-red-400/70 mb-1">Tasks Pending</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {dashboardData?.todos?.pendingTodos || 0}
                  </p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                  <p className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70 mb-1">Tasks Done</p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {dashboardData?.todos?.completedTodos || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function SemesterAlertBanner({ notification, onDismiss }) {
  if (!notification) return null;
  const isUpcoming = notification.type === 'upcoming';
  
  return (
    <div className={`w-full rounded-2xl border p-4 shadow-sm relative overflow-hidden mb-6 flex items-start gap-4 ${isUpcoming ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'}`}>
      <div className={`p-2 rounded-xl shrink-0 ${isUpcoming ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'}`}>
        <CalendarCheck className="h-5 w-5" />
      </div>
      <div className="flex-1 pt-1">
        <h3 className={`text-sm font-bold ${isUpcoming ? 'text-amber-900 dark:text-amber-100' : 'text-indigo-900 dark:text-indigo-100'}`}>
          {isUpcoming ? 'Upcoming Semester Update' : 'Semester Auto-Updated'}
        </h3>
        <p className={`text-xs mt-1 font-medium ${isUpcoming ? 'text-amber-700 dark:text-amber-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
          {isUpcoming 
            ? `Heads up! Your semester is scheduled to automatically update in ${notification.daysAway} day(s) (on ${notification.dateString}).` 
            : `Welcome to Semester ${notification.newSemester}! Your semester has been automatically updated today.`}
        </p>
      </div>
      <button onClick={onDismiss} className={`p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity ${isUpcoming ? 'hover:bg-amber-200/50 dark:hover:bg-amber-800/50 text-amber-900 dark:text-amber-100' : 'hover:bg-indigo-200/50 dark:hover:bg-indigo-800/50 text-indigo-900 dark:text-indigo-100'}`}>
         <span className="sr-only">Dismiss</span>
         <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
         </svg>
      </button>
    </div>
  );
}
