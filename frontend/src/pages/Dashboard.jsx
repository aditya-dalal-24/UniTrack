import { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck,
  BookOpen,
  GraduationCap,
  CalendarPlus,
  Quote,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
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
import FocusModeToggle from "../components/dashboard/FocusModeToggle";

const WIDGET_ORDER_KEY = "dashboard_widget_order_v2";
const HIDDEN_WIDGETS_KEY = "dashboard_hidden_widgets_v2";
const FOCUS_MODE_KEY = "dashboard_focus_mode";

const ALL_WIDGETS = [
  "today",
  "attendance-risk",
  "smart-tasks",
  "reminders",
  "academic-pressure",
  "semester-health",
  "expense-snapshot",
  "quick-actions",
];

const DEFAULT_ORDER = [
  "today",
  "attendance-risk",
  "smart-tasks",
  "reminders",
];

const DEFAULT_HIDDEN = ALL_WIDGETS.filter((id) => !DEFAULT_ORDER.includes(id));

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

  // Focus mode (persisted)
  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem(FOCUS_MODE_KEY) === "true";
  });

  // Widget states
  const [widgetOrder, setWidgetOrder] = useState(() => {
    try {
      const stored = localStorage.getItem(WIDGET_ORDER_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [...DEFAULT_ORDER];
  });

  const [hiddenWidgets, setHiddenWidgets] = useState(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_WIDGETS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [...DEFAULT_HIDDEN];
  });

  const {
    notification: semesterNotification,
    dismissNotification,
  } = useSemesterManager();

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

  // ── CALLBACKS ──────────────────────────────────────
  const handleRetry = useCallback(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  const handleWizardComplete = useCallback(() => {
    invalidateDashboard();
    fetchDashboard(true, false);
    // Re-fetch lectures
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
      const todayISO = new Date().toISOString().split("T")[0];
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
      const todayISO = new Date().toISOString().split("T")[0];
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
      const todayISO = new Date().toISOString().split("T")[0];
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
      }
    },
    [invalidateDashboard, fetchDashboard]
  );

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      localStorage.setItem(FOCUS_MODE_KEY, String(next));
      return next;
    });
  }, []);

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
            .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
          setTomorrowLectures(tomorrowSlots);
        }
      } catch (err) {}
    };

    fetchThought();
    fetchLectures();
    fetchTomorrowLectures();
  }, [fetchDashboard]);

  // ── RENDER STATES ──────────────────────────────────
  if (loading) return <LoadingSpinner message="Loading dashboard..." fullPage showColdStartMsg />;
  if (error) return <ErrorMessage message={error} onRetry={handleRetry} />;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Dashboard"
          description="Your intelligent academic assistant."
        />
        <div className="flex items-center gap-2">
          <FocusModeToggle focusMode={focusMode} onToggle={toggleFocusMode} />
        </div>
      </div>

      {/* SEMESTER ALERT BANNER */}
      <SemesterAlertBanner
        notification={semesterNotification}
        onDismiss={dismissNotification}
      />

      {/* Minimalist Welcome Card */}
      {userData && (
        <div className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-start gap-8">
            <UserAvatar
              name={userData.name || userData.fullName}
              userId={userData.userId}
              className="h-14 w-14 sm:h-16 sm:w-16 text-lg"
            />
            <div className="flex-1 w-full">
              <div className="flex flex-col lg:flex-row justify-between gap-8">
                <div className="flex-1 space-y-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Welcome back, {userData.name || userData.fullName || "Student"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                      Take a gentle moment to mark your attendance for today. Your progress matters.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    {userData.semester && (
                      <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <GraduationCap className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium">Semester {userData.semester}</span>
                      </div>
                    )}
                    {dashboardData?.subjects && (
                      <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                        <BookOpen className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium">{dashboardData.subjects.length} Subjects</span>
                      </div>
                    )}
                  </div>

                  {/* Mark Attendance Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => setShowWizard(true)}
                      className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-sm font-bold shadow-sm transition-all"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Mark Attendance
                    </button>
                    <button
                      onClick={handlePerfectDay}
                      disabled={perfectDayLoading}
                      className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-sm transition-all disabled:opacity-50"
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
                      className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-sm transition-all disabled:opacity-50"
                    >
                      {perfectDayLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                      )}
                      Skipped All
                    </button>
                  </div>
                </div>

                {todayThought && (
                  <div className="lg:w-72 xl:w-80 flex-shrink-0 flex items-start border-l border-slate-100 dark:border-slate-800/80 pl-8">
                    <div className="flex flex-col gap-3">
                      <Quote className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm italic text-slate-600 dark:text-slate-400 leading-relaxed">
                        "{todayThought.text}"
                      </p>
                      <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                        — {todayThought.author}
                      </span>
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

      {/* Smart Widget Grid */}
      <WidgetGrid
        insights={insights}
        order={widgetOrder}
        onReorder={handleReorder}
        onHideWidget={handleHideWidget}
        focusMode={focusMode}
        loading={lecturesLoading && !dashboardData}
        onOpenWizard={() => setShowWizard(true)}
        onMarkAttendance={handleQuickMark}
      />

      {/* Hidden Widgets Manager */}
      {!focusMode && hiddenWidgets.length > 0 && (
        <WidgetManager
          hiddenWidgets={hiddenWidgets}
          onRestoreWidget={handleRestoreWidget}
        />
      )}
    </div>
  );
}

function SemesterAlertBanner({ notification, onDismiss }) {
  if (!notification) return null;
  const isUpcoming = notification.type === "upcoming";

  return (
    <div
      className={`w-full rounded-xl border p-4 shadow-sm mb-6 flex items-start gap-4 ${
        isUpcoming
          ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30"
          : "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="pt-0.5">
        <CalendarCheck className={`h-4 w-4 ${isUpcoming ? "text-amber-500" : "text-slate-500"}`} />
      </div>
      <div className="flex-1">
        <h3 className={`text-sm font-bold ${isUpcoming ? "text-amber-900 dark:text-amber-100" : "text-slate-900 dark:text-white"}`}>
          {isUpcoming ? "Upcoming Semester Update" : "Semester Auto-Updated"}
        </h3>
        <p className={`text-xs mt-0.5 ${isUpcoming ? "text-amber-700/80 dark:text-amber-300/80" : "text-slate-600 dark:text-slate-400"}`}>
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
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
