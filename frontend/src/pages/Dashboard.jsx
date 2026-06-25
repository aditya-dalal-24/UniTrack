import { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck,
  BookOpen,
  GraduationCap,
  CalendarPlus,
  Calendar,
  Quote,
  Sparkles,
  Loader2,
  X,
  ListPlus,
  Wallet,
  Clock,
  MapPin,
  Check,
  Sunrise,
  Award,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import MarkAttendanceWizard from "../components/MarkAttendanceWizard";
import UserAvatar from "../components/UserAvatar";

import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { api } from "../services/api";
import { useSemesterManager } from "../hooks/useSemesterManager";
import { useInsightsEngine } from "../hooks/useInsightsEngine";

import WidgetGrid from "../components/dashboard/WidgetGrid";
import WidgetManager from "../components/dashboard/WidgetManager";

const WIDGET_ORDER_KEY = "dashboard_widget_order_v3";
const HIDDEN_WIDGETS_KEY = "dashboard_hidden_widgets_v3";

const ALL_WIDGETS = [
  "attendance-risk",
  "semester-health",
  "academic-pressure",
  "smart-tasks",
  "expense-snapshot",
  "reminders",
];

const DEFAULT_ORDER = [...ALL_WIDGETS];
const DEFAULT_HIDDEN = [];

function getGreeting() {
  const hour = new Date().getHours();
  if(hour<5) return "Still Up?"
  if (hour>5 &&hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatCountdown(mins) {
  if (mins === null || mins === undefined) return "";
  if (mins <= 0) return "now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function Dashboard() {
  const { userData } = useAuth();
  const {
    dashboardData,
    dashboardLoading: loading,
    dashboardError: error,
    fetchDashboard,
    invalidateDashboard,
  } = useData();

  const [showWizard, setShowWizard] = useState(false);
  const [todayThought, setTodayThought] = useState(null);
  const [perfectDayLoading, setPerfectDayLoading] = useState(false);
  const [todayLectures, setTodayLectures] = useState([]);
  const [tomorrowLectures, setTomorrowLectures] = useState([]);
  const [lecturesLoading, setLecturesLoading] = useState(true);

  // Widget states (v3 keys — "today" is no longer a widget)
  const [widgetOrder, setWidgetOrder] = useState(() => {
    try {
      const stored = localStorage.getItem(WIDGET_ORDER_KEY);
      if (stored) return JSON.parse(stored).filter((id) => id !== "today");
    } catch {}
    return [...DEFAULT_ORDER];
  });

  const [hiddenWidgets, setHiddenWidgets] = useState(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_WIDGETS_KEY);
      if (stored) return JSON.parse(stored).filter((id) => id !== "today");
    } catch {}
    return [...DEFAULT_HIDDEN];
  });

  const { notification: semesterNotification, dismissNotification } =
    useSemesterManager();

  const minAttendanceCap = parseInt(
    localStorage.getItem("minAttendanceCap") || "75",
    10
  );

  // ── INSIGHTS ENGINE ──────────────────────────────
  const insights = useInsightsEngine(
    dashboardData,
    todayLectures,
    tomorrowLectures,
    minAttendanceCap
  );

  const todayData = insights?.today;

  // ── CALLBACKS ──────────────────────────────────────
  const handleRetry = useCallback(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  const handleWizardComplete = useCallback(() => {
    invalidateDashboard();
    fetchDashboard(true, false);
    api.getTodayLectures().then(({ data }) => {
      if (data) setTodayLectures(data);
    });
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
      const now = new Date();
      const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      );
      const todayISO = localDate.toISOString().split("T")[0];
      const processedSubjects = new Set();

      for (const lecture of lectures) {
        if (lecture.subjectId && processedSubjects.has(lecture.subjectId))
          continue;

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
      const { data: updatedLectures } = await api.getTodayLectures();
      if (updatedLectures) setTodayLectures(updatedLectures);
    } catch (e) {
      console.error(e);
    }
    setPerfectDayLoading(false);
  };

  const handleZeroDay = async () => {
    if (perfectDayLoading) return;
    setPerfectDayLoading(true);
    try {
      const { data: lectures } = await api.getTodayLectures();
      if (!lectures || lectures.length === 0) {
        setPerfectDayLoading(false);
        return;
      }
      const now = new Date();
      const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      );
      const todayISO = localDate.toISOString().split("T")[0];
      const processedSubjects = new Set();

      for (const lecture of lectures) {
        if (lecture.subjectId && processedSubjects.has(lecture.subjectId))
          continue;

        const res = await api.markAttendance({
          date: todayISO,
          status: "ABSENT",
          timetableSlotId: lecture.slotId,
          subjectId: lecture.subjectId || null,
        });

        if (lecture.subjectId && !res.error) {
          processedSubjects.add(lecture.subjectId);
        }
      }

      invalidateDashboard();
      fetchDashboard(true, false);
      const { data: updatedLectures } = await api.getTodayLectures();
      if (updatedLectures) setTodayLectures(updatedLectures);
    } catch (e) {
      console.error(e);
    }
    setPerfectDayLoading(false);
  };

  const handleQuickMark = useCallback(
    async (lecture, status) => {
      const now = new Date();
      const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      );
      const todayISO = localDate.toISOString().split("T")[0];

      const { error: apiError } = await api.markAttendance({
        date: todayISO,
        status,
        timetableSlotId: lecture.slotId,
        subjectId: lecture.subjectId || null,
      });

      if (!apiError) {
        setTodayLectures((prev) =>
          prev.map((l) => {
            if (l.slotId === lecture.slotId) return { ...l, status };
            if (lecture.subjectId && l.subjectId === lecture.subjectId)
              return { ...l, status };
            return l;
          })
        );
        invalidateDashboard();
        fetchDashboard(true, false);
      } else {
        alert("Failed to mark attendance: " + apiError);
      }
    },
    [invalidateDashboard, fetchDashboard]
  );

  // Widget management callbacks
  const handleReorder = useCallback((oldIndex, newIndex) => {
    setWidgetOrder((prev) => {
      const newOrder = [...prev];
      const [movedItem] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, movedItem);
      localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(newOrder));
      return newOrder;
    });
  }, []);

  const handleHideWidget = useCallback((id) => {
    setWidgetOrder((prev) => {
      const newOrder = prev.filter((w) => w !== id);
      localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(newOrder));
      return newOrder;
    });
    setHiddenWidgets((prev) => {
      const newHidden = [...prev, id];
      localStorage.setItem(HIDDEN_WIDGETS_KEY, JSON.stringify(newHidden));
      return newHidden;
    });
  }, []);

  const handleRestoreWidget = useCallback((id) => {
    setHiddenWidgets((prev) => {
      const newHidden = prev.filter((w) => w !== id);
      localStorage.setItem(HIDDEN_WIDGETS_KEY, JSON.stringify(newHidden));
      return newHidden;
    });
    setWidgetOrder((prev) => {
      const newOrder = [...prev, id];
      localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(newOrder));
      return newOrder;
    });
  }, []);

  // ── DATA FETCHING ──────────────────────────────────
  useEffect(() => {
    fetchDashboard();

    const fetchThought = async () => {
      const { data } = await api.getTodayThought();
      if (data) setTodayThought(data);
    };

    const fetchLectures = async () => {
      setLecturesLoading(true);
      try {
        const { data } = await api.getTodayLectures();
        setTodayLectures(data || []);
      } catch (err) {
        console.error("Failed to fetch lectures:", err);
      } finally {
        setLecturesLoading(false);
      }
    };

    const fetchTomorrowLectures = async () => {
      try {
        const { data: timetable } = await api.getTimetable();
        if (timetable) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowDay = tomorrow
            .toLocaleDateString("en-US", { weekday: "long" })
            .toUpperCase();
          const tomorrowSlots = timetable
            .filter((slot) => slot.dayOfWeek === tomorrowDay && !slot.isBreak)
            .sort((a, b) =>
              (a.startTime || "").localeCompare(b.startTime || "")
            );
          setTomorrowLectures(tomorrowSlots);
        }
      } catch (err) {}
    };

    fetchThought();
    fetchLectures();
    fetchTomorrowLectures();
  }, [fetchDashboard]);

  // ── RENDER STATES ──────────────────────────────────
  if (loading)
    return (
      <LoadingSpinner
        message="Loading dashboard..."
        fullPage
        showColdStartMsg
      />
    );
  if (error) return <ErrorMessage message={error} onRetry={handleRetry} />;

  const greeting = getGreeting();
  const formattedDate = getFormattedDate();
  const userName = userData?.name || userData?.fullName || "Student";
  const heroLecture = todayData?.currentLecture || todayData?.nextLecture;

  return (
    <div className="space-y-6 pb-12">
      {/* SEMESTER ALERT BANNER */}
      <SemesterAlertBanner
        notification={semesterNotification}
        onDismiss={dismissNotification}
      />

      {/* ═══════════════════════════════════════════════
          HERO GREETING
          ═══════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left — Avatar + Greeting + Meta */}
          <div className="flex items-start gap-4 sm:gap-5">
            {userData && (
              <UserAvatar
                name={userName}
                userId={userData.userId}
                className="h-12 w-12 sm:h-14 sm:w-14 text-base sm:text-lg"
              />
            )}
            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 tracking-wide">
                {formattedDate}
              </p>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
                {greeting}, {userName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {userData?.semester && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                    <GraduationCap className="h-3 w-3" />
                    Semester {userData.semester}
                  </span>
                )}
                {dashboardData?.subjects && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                    <BookOpen className="h-3 w-3" />
                    {dashboardData.subjects.length} Subjects
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right — Quote of the Day (desktop only) */}
          {todayThought && (
            <div className="hidden lg:flex flex-col gap-2 max-w-xs xl:max-w-sm flex-shrink-0 pl-6 border-l border-slate-200/60 dark:border-slate-800">
              <Quote className="h-4 w-4 text-slate-300 dark:text-slate-600" />
              <p className="text-[13px] italic text-slate-500 dark:text-slate-400 leading-relaxed">
                &ldquo;{todayThought.text}&rdquo;
              </p>
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                — {todayThought.author}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-5 w-full">
          {/* Primary Action Buttons (Left) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 shadow-sm backdrop-blur-sm w-full lg:w-auto">
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-sm font-bold shadow-sm transition-all duration-200 active:scale-[0.98] w-full sm:w-auto"
            >
              <CalendarPlus className="h-4 w-4" />
              Mark Attendance
            </button>
            {todayLectures.length > 0 && (
              <>
                <button
                  onClick={handlePerfectDay}
                  disabled={perfectDayLoading}
                  className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 border border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-200 dark:hover:border-emerald-800/40 shadow-xs transition-all duration-200 active:scale-[0.98] disabled:opacity-50 w-full sm:w-auto"
                >
                  {perfectDayLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  )}
                  Perfect Day
                </button>
                <button
                  onClick={handleZeroDay}
                  disabled={perfectDayLoading}
                  className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 border border-slate-200/80 dark:border-slate-700/80 hover:border-red-200 dark:hover:border-red-800/40 shadow-xs transition-all duration-200 active:scale-[0.98] disabled:opacity-50 w-full sm:w-auto"
                >
                  {perfectDayLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                  )}
                  Skipped All
                </button>
              </>
            )}
          </div>

          {/* Quick Navigation Panel (Right) */}
          <div className="grid grid-cols-2 gap-2 w-full lg:w-auto lg:flex lg:flex-row lg:items-center lg:gap-2 p-2 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 shadow-sm backdrop-blur-sm">
            <Link
              to="/schedule#setup"
              className="inline-flex items-center justify-center lg:justify-start gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs transition-all duration-200 active:scale-[0.98] w-full lg:w-auto"
            >
              <Calendar className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <span>View Timetable</span>
            </Link>
            <Link
              to="/marks#add"
              className="inline-flex items-center justify-center lg:justify-start gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs transition-all duration-200 active:scale-[0.98] w-full lg:w-auto"
            >
              <Award className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <span>Enter Marks</span>
            </Link>
            <Link
              to="/tasks"
              className="inline-flex items-center justify-center lg:justify-start gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs transition-all duration-200 active:scale-[0.98] w-full lg:w-auto"
            >
              <ListPlus className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              <span>Add Task</span>
            </Link>
            <Link
              to="/expenses#add"
              className="inline-flex items-center justify-center lg:justify-start gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs transition-all duration-200 active:scale-[0.98] w-full lg:w-auto"
            >
              <Wallet className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              <span>Add Expense</span>
            </Link>
          </div>
        </div>

        {/* Mobile quote (shown on small screens) */}
        {todayThought && (
          <div className="lg:hidden mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
            <Quote className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs italic text-slate-500 dark:text-slate-400 leading-relaxed">
                &ldquo;{todayThought.text}&rdquo;
              </p>
              <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                — {todayThought.author}
              </span>
            </div>
          </div>
        )}
      </motion.section>

      {/* ═══════════════════════════════════════════════
          TODAY'S SCHEDULE STRIP
          ═══════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
      >
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              </div>
              <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 tracking-wide">
                Today&apos;s Schedule
              </h2>
            </div>
            {todayData && todayData.totalLectures > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                {todayData.completedCount}/{todayData.totalLectures} marked
              </span>
            )}
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5">
            {lecturesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300 dark:text-slate-600" />
              </div>
            ) : !todayData || todayData.totalLectures === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                  <Sunrise className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  No lectures scheduled today
                </p>
                {todayData?.tomorrowFirst && (
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Sunrise className="h-3 w-3" />
                    Tomorrow starts at {todayData.tomorrowFirst.startTime}
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {todayData.lectures.map((l, i) => {
                  const isHero =
                    heroLecture && l.slotId === heroLecture.slotId;
                  const isCurrent =
                    todayData.currentLecture &&
                    l.slotId === todayData.currentLecture.slotId;

                  return (
                    <div
                      key={l.slotId || i}
                      className={`relative p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-slate-900 dark:bg-white border-slate-800 dark:border-slate-200 shadow-lg shadow-slate-900/10 dark:shadow-white/10"
                          : isHero
                          ? "bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-600 ring-1 ring-slate-900/5 dark:ring-white/5"
                          : l.status === "PRESENT"
                          ? "bg-emerald-50/50 border-emerald-200/60 dark:bg-emerald-900/10 dark:border-emerald-800/30"
                          : l.status === "ABSENT"
                          ? "bg-red-50/50 border-red-200/60 dark:bg-red-900/10 dark:border-red-800/30"
                          : "bg-white dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-700/50"
                      }`}
                    >
                      {/* Status badge for current/next */}
                      {(isCurrent || (isHero && !isCurrent)) && (
                        <div className="flex items-center gap-1.5 mb-2">
                          {isCurrent && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              isCurrent
                                ? "text-emerald-400 dark:text-emerald-600"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {isCurrent
                              ? "Happening Now"
                              : `Up Next · ${formatCountdown(todayData.minutesUntilNext)}`}
                          </span>
                        </div>
                      )}

                      {/* Subject name */}
                      <p
                        className={`text-sm font-bold leading-tight ${
                          isCurrent
                            ? "text-white dark:text-slate-900"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {l.subjectName || "Lecture"}
                      </p>

                      {/* Time + Room */}
                      <div
                        className={`flex items-center gap-3 mt-1.5 text-[11px] ${
                          isCurrent
                            ? "text-slate-400 dark:text-slate-500"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {l.startTime} – {l.endTime}
                        </span>
                        {l.roomNumber && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {l.roomNumber}
                          </span>
                        )}
                      </div>

                      {/* Attendance buttons */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleQuickMark(l, "PRESENT")}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            l.status === "PRESENT"
                              ? "bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/50"
                              : isCurrent
                              ? "bg-white/15 text-white/80 hover:bg-white/25 dark:bg-slate-900/30 dark:text-slate-500 dark:hover:bg-slate-900/50"
                              : l.status === "ABSENT"
                              ? "bg-slate-100 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                          }`}
                        >
                          <Check className="h-3 w-3" /> Present
                        </button>
                        <button
                          onClick={() => handleQuickMark(l, "ABSENT")}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            l.status === "ABSENT"
                              ? "bg-red-500 text-white shadow-sm ring-1 ring-red-500/50"
                              : isCurrent
                              ? "bg-white/15 text-white/80 hover:bg-white/25 dark:bg-slate-900/30 dark:text-slate-500 dark:hover:bg-slate-900/50"
                              : l.status === "PRESENT"
                              ? "bg-slate-100 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                              : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                          }`}
                        >
                          <X className="h-3 w-3" /> Absent
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {todayData && todayData.totalLectures > 0 && (
            <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800/50 text-[11px]">
              <span className="font-bold">
                {todayData.unmarkedCount > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    {todayData.unmarkedCount} unmarked
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    All marked ✓
                  </span>
                )}
              </span>
              {todayData.tomorrowFirst && (
                <span className="flex items-center gap-1 text-slate-400 font-medium">
                  <Sunrise className="h-3 w-3" />
                  Tomorrow at {todayData.tomorrowFirst.startTime}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.section>

      {/* Attendance Wizard Modal */}
      <MarkAttendanceWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
      />

      {/* ═══════════════════════════════════════════════
          INSIGHTS GRID (DnD-enabled)
          ═══════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16, ease: "easeOut" }}
      >
        <WidgetGrid
          insights={insights}
          order={widgetOrder}
          onReorder={handleReorder}
          onHideWidget={handleHideWidget}
          loading={lecturesLoading && !dashboardData}
        />
      </motion.section>

      {/* Hidden Widgets Manager */}
      {hiddenWidgets.length > 0 && (
        <WidgetManager
          hiddenWidgets={hiddenWidgets}
          onRestoreWidget={handleRestoreWidget}
        />
      )}
    </div>
  );
}

// ── Semester Alert Banner ──────────────────────────────
function SemesterAlertBanner({ notification, onDismiss }) {
  if (!notification) return null;
  const isUpcoming = notification.type === "upcoming";

  return (
    <div
      className={`w-full rounded-xl border p-4 shadow-sm flex items-start gap-4 ${
        isUpcoming
          ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30"
          : "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="pt-0.5">
        <CalendarCheck
          className={`h-4 w-4 ${
            isUpcoming ? "text-amber-500" : "text-slate-500"
          }`}
        />
      </div>
      <div className="flex-1">
        <h3
          className={`text-sm font-bold ${
            isUpcoming
              ? "text-amber-900 dark:text-amber-100"
              : "text-slate-900 dark:text-white"
          }`}
        >
          {isUpcoming ? "Upcoming Semester Update" : "Semester Auto-Updated"}
        </h3>
        <p
          className={`text-xs mt-0.5 ${
            isUpcoming
              ? "text-amber-700/80 dark:text-amber-300/80"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {isUpcoming
            ? `Heads up! Your semester is scheduled to automatically update in ${notification.daysAway} day(s) (on ${notification.dateString}).`
            : `Welcome to Semester ${notification.newSemester}! Your semester has been automatically updated today.`}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <span className="sr-only">Dismiss</span>
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
