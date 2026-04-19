import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  CalendarCheck,
  BookOpen,
  CreditCard,
  GraduationCap,
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import UserAvatar from "../components/UserAvatar";
import {
  BarChart,
  Bar,
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
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await api.getDashboard();
    if (apiError) {
      setError(apiError);
    } else {
      setDashboardData(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  if (loading) return <LoadingSpinner message="Loading dashboard..." fullPage showColdStartMsg />;
  if (error) return <ErrorMessage message={error} onRetry={fetchDashboard} />;

  const fees = dashboardData?.fees;
  const assignments = dashboardData?.assignments;
  const tasks = dashboardData?.tasks;
  const todos = dashboardData?.todos;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your academic performance and activities."
      />

      {/* Welcome Card with User Info */}
      {userData && (
        <div className="rounded-2xl bg-gradient-to-br from-brand/10 via-accent/10 to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <UserAvatar 
              name={userData.name || userData.fullName} 
              userId={userData.userId} 
              className="h-14 w-14 text-sm" 
            />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                Welcome back, {userData.name || userData.fullName || "Student"}!
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {userData.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Email:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{userData.email}</span>
                  </div>
                )}
                {userData.rollNumber && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Roll No:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{userData.rollNumber}</span>
                  </div>
                )}
                {userData.course && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Course:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{userData.course}</span>
                  </div>
                )}
                {userData.semester && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Semester:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sem {userData.semester}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        <motion.div 
          whileHover={{ y: -5, scale: 1.02 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => navigate('/schedule')}
          className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 cursor-pointer transition-transform duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-800 dark:bg-white dark:text-black">
              <CalendarCheck size={20} />
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance</div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                {Math.round(attendance?.attendancePercentage || 0)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {attendance?.presentDays || 0} / {attendance?.totalWorkingDays || 0} lectures attended
              </div>
            </div>
            {attendance?.lastMonthPercentage !== undefined && (
              <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
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
        </motion.div>

        <StatsCard
          title="Tasks"
          value={String(tasks?.pendingTasks || 0)}
          icon={BookOpen}
          description={`Assignments: ${assignments?.submittedAssignments || 0} completed out of ${assignments?.totalAssignments || 0}\nTodos: ${todos?.completedTodos || 0} completed out of ${todos?.totalTodos || 0}`}
          color="brand"
          onClick={() => navigate('/tasks')}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Subject-wise Attendance Chart */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Subject Attendance
            </h3>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis</div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis 
                  dataKey="subject" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
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
                <Bar 
                  dataKey="percentage" 
                  fill="#0ea5e9"
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                >
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.percentage >= 75 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Expenses Chart */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Expense History
            </h3>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
              ₹{(dashboardData?.expenses?.totalSpentThisMonth || 0).toLocaleString()}
              <span className="text-xs font-normal text-slate-500 ml-2">this month</span>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData?.expenses?.monthlyHistory || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                />
                <YAxis hide />
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
                />
                <Bar 
                  dataKey="amount" 
                  fill={isDark ? '#94a3b8' : '#475569'} 
                  radius={[6, 6, 0, 0]} 
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
          <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">
            Academic Performance
          </h3>
          <div className="flex flex-col items-center justify-center h-64 gap-6">
            <div className="text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">CGPA</p>
              <p className="text-5xl font-bold text-brand dark:text-white">
                {((dashboardData?.marks?.cgpa) || 0).toFixed(2)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-center">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Current SGPA</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {((dashboardData?.marks?.currentSgpa) || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Subjects</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {dashboardData?.marks?.totalSubjects || 0}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 text-center">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tasks Pending</p>
                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                  {dashboardData?.todos?.pendingTodos || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tasks Done</p>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {dashboardData?.todos?.completedTodos || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
