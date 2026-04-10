import { useState, useEffect } from "react";
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

const COLORS = ["#6366f1", "#f472b6", "#fbbf24", "#f87171"];

export default function Dashboard() {
  const { userData } = useAuth();
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

  if (loading) return <LoadingSpinner message="Loading dashboard..." fullPage />;
  if (error) return <ErrorMessage message={error} onRetry={fetchDashboard} />;

  const attendance = dashboardData?.attendance;
  const fees = dashboardData?.fees;
  const assignments = dashboardData?.assignments;

  // Chart data from dashboard response (fallback to empty)
  const monthlyExpensesData = [
    { name: "This Month", amount: dashboardData?.expenses?.totalSpentThisMonth || 0 },
  ];

  const marksData = dashboardData?.marks ? [
    { name: "CGPA", value: dashboardData.marks.cgpa || 0 },
    { name: "Current SGPA", value: dashboardData.marks.currentSgpa || 0 },
  ] : [];

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
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent shadow-md">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                Welcome back, {userData.name || userData.fullName || "Student"}!
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {userData.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Email:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{userData.email}</span>
                  </div>
                )}
                {userData.course && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Course:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{userData.course}</span>
                  </div>
                )}
                {userData.semester && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Semester:</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Semester {userData.semester}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="My Attendance"
          value={`${Math.round(attendance?.attendancePercentage || 0)}%`}
          icon={CalendarCheck}
          trend={`${attendance?.presentDays || 0}/${attendance?.totalWorkingDays || 0} days`}
          trendUp={true}
          color="emerald"
        />
        <StatsCard
          title="Pending Fees"
          value={`₹ ${((fees?.totalPending || 0) / 1000).toFixed(1)}K`}
          icon={CreditCard}
          description={`Total: ₹${((fees?.totalFees || 0) / 1000).toFixed(1)}K`}
          color="red"
        />
        <StatsCard
          title="Assignments"
          value={String(assignments?.pendingAssignments || 0)}
          icon={BookOpen}
          description={`${assignments?.totalAssignments || 0} total`}
          color="accent"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Expenses Chart */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
          <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">
            Expense Summary
          </h3>
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              ₹{(dashboardData?.expenses?.totalSpentThisMonth || 0).toLocaleString()}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Spent this month</p>
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mt-4">
              ₹{(dashboardData?.expenses?.totalSpentAllTime || 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Total all time</p>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
          <h3 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">
            Academic Performance
          </h3>
          <div className="flex flex-col items-center justify-center h-64 gap-6">
            <div className="text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">CGPA</p>
              <p className="text-5xl font-bold text-brand">
                {dashboardData?.marks?.cgpa?.toFixed(2) || "—"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-center">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Current SGPA</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {dashboardData?.marks?.currentSgpa?.toFixed(2) || "—"}
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Todos Pending</p>
                <p className="text-xl font-bold text-amber-600">
                  {dashboardData?.todos?.pendingTodos || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Todos Done</p>
                <p className="text-xl font-bold text-emerald-600">
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
