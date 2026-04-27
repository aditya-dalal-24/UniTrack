import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Loader2,
  Users,
  AlertTriangle,
} from "lucide-react";
import { api } from "../services/api";

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
};

export default function MarkAttendanceWizard({ isOpen, onClose, onComplete }) {
  const [lectures, setLectures] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState(false);

  // Fetch today's lectures on open
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setCompleted(false);
    setCurrentStep(0);
    setDirection(1);

    api.getTodayLectures().then(({ data, error: apiError }) => {
      if (apiError) {
        setError(apiError);
      } else {
        setLectures(data || []);
      }
      setLoading(false);
    });
  }, [isOpen]);

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleMark = useCallback(
    async (status) => {
      const lecture = lectures[currentStep];
      if (!lecture || saving) return;

      // If this subject was already marked with the same status (e.g., 2nd lab slot),
      // skip the API call and just advance
      if (lecture.subjectId && lecture.status === status) {
        if (currentStep < lectures.length - 1) {
          setDirection(1);
          setCurrentStep((s) => s + 1);
        } else {
          setCompleted(true);
        }
        return;
      }

      setSaving(true);
      const todayISO = new Date().toISOString().split("T")[0];

      const { data, error: apiError } = await api.markAttendance({
        date: todayISO,
        status,
        timetableSlotId: lecture.slotId,
        subjectId: lecture.subjectId || null,
      });

      if (apiError) {
        setSaving(false);
        return; // Keep user on this card to retry
      }

      // Update local state with the saved status for this lecture AND any others with the same subject
      setLectures((prev) =>
        prev.map((l, i) => {
          if (i === currentStep) {
            return { ...l, status, attendanceRecordId: data?.id || l.attendanceRecordId };
          }
          if (lecture.subjectId && l.subjectId === lecture.subjectId) {
            return { ...l, status, attendanceRecordId: data?.id || l.attendanceRecordId };
          }
          return l;
        })
      );

      setSaving(false);

      // Auto-advance or complete
      if (currentStep < lectures.length - 1) {
        setDirection(1);
        setCurrentStep((s) => s + 1);
      } else {
        setCompleted(true);
      }
    },
    [currentStep, lectures, saving]
  );

  const handleMarkAll = useCallback(
    async (status) => {
      if (saving) return;
      setSaving(true);
      const todayISO = new Date().toISOString().split("T")[0];

      const processedSubjects = new Map(); // subjectId -> attendanceRecordId
      const results = [];

      for (const lecture of lectures) {
        if (lecture.subjectId && processedSubjects.has(lecture.subjectId)) {
           // Already marked this subject in this loop
           results.push({ data: { id: processedSubjects.get(lecture.subjectId) }, error: null });
           continue;
        }

        const res = await api.markAttendance({
          date: todayISO,
          status,
          timetableSlotId: lecture.slotId,
          subjectId: lecture.subjectId || null,
        });

        if (lecture.subjectId && !res.error && res.data) {
           processedSubjects.set(lecture.subjectId, res.data.id);
        }
        results.push(res);
      }

      const hasError = results.some((r) => r.error);
      if (!hasError) {
        setLectures((prev) =>
          prev.map((l, i) => ({
            ...l,
            status,
            attendanceRecordId: results[i]?.data?.id || l.attendanceRecordId,
          }))
        );
        setCompleted(true);
      }
      setSaving(false);
    },
    [lectures, saving]
  );

  const goBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  };

  const goNext = () => {
    if (currentStep < lectures.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  };

  const handleClose = () => {
    if (completed || lectures.some((l) => l.status)) {
      onComplete?.();
    }
    onClose();
  };

  // Summary stats
  const presentCount = lectures.filter((l) => l.status === "PRESENT").length;
  const absentCount = lectures.filter((l) => l.status === "ABSENT").length;
  const unmarkedCount = lectures.filter((l) => !l.status).length;

  if (!isOpen) return null;

  const currentLecture = lectures[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-emerald-500" />
                  Mark Attendance
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {dayName}, {dateStr}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6" style={{ minHeight: 380 }}>
              {/* Loading state */}
              {loading && (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  <p className="text-sm text-slate-500">Loading today's schedule...</p>
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* No lectures state */}
              {!loading && !error && lectures.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                  <CalendarCheck className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                    No lectures today
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Enjoy your day off! 🎉
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Completion summary */}
              {!loading && !error && completed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center gap-4 pt-4"
                >
                  <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-9 w-9 text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Attendance Marked!
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      All {lectures.length} lectures recorded for today.
                    </p>
                  </div>

                  {/* Summary stats */}
                  <div className="w-full grid grid-cols-2 gap-3 mt-2">
                    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40 p-4 text-center">
                      <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        {presentCount}
                      </div>
                      <div className="text-xs font-medium text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">
                        Present
                      </div>
                    </div>
                    <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40 p-4 text-center">
                      <div className="text-2xl font-extrabold text-red-600 dark:text-red-400">
                        {absentCount}
                      </div>
                      <div className="text-xs font-medium text-red-700/70 dark:text-red-400/70 mt-0.5">
                        Absent
                      </div>
                    </div>
                  </div>

                  {/* Lecture breakdown */}
                  <div className="w-full mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                    {lectures.map((l, i) => (
                      <div
                        key={l.slotId}
                        className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {l.subjectName || "Lecture"}
                          </span>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {l.startTime}
                          </span>
                        </div>
                        {l.status === "PRESENT" ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Present
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-500 dark:text-red-400">
                            <XCircle className="h-3.5 w-3.5" /> Absent
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full mt-3 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                </motion.div>
              )}

              {/* Step-by-step lecture cards */}
              {!loading && !error && lectures.length > 0 && !completed && (
                <>
                  {/* Progress bar */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Lecture {currentStep + 1} of {lectures.length}
                      </span>
                      <span className="text-xs text-slate-400">
                        {Math.round(((currentStep) / lectures.length) * 100)}% done
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(currentStep / lectures.length) * 100}%`,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Lecture Card */}
                  <div className="relative overflow-hidden" style={{ minHeight: 180 }}>
                    <AnimatePresence mode="wait" custom={direction}>
                      <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                          type: "spring",
                          stiffness: 350,
                          damping: 30,
                        }}
                        className="w-full"
                      >
                        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 p-5">
                          {/* Subject name */}
                          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                            {currentLecture?.subjectName || "Lecture"}
                          </h3>
                          {currentLecture?.subjectFullName &&
                            currentLecture.subjectFullName !== currentLecture.subjectName && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {currentLecture.subjectFullName}
                              </p>
                            )}

                          {/* Meta row */}
                          <div className="flex flex-wrap gap-3 mt-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="font-medium">
                                {currentLecture?.startTime} – {currentLecture?.endTime}
                              </span>
                            </div>
                            {currentLecture?.professor && (
                              <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                <User className="h-4 w-4 text-slate-400" />
                                <span>{currentLecture.professor}</span>
                              </div>
                            )}
                            {currentLecture?.roomNumber && (
                              <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <span>{currentLecture.roomNumber}</span>
                              </div>
                            )}
                            {currentLecture?.groupInfo && (
                              <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                <Users className="h-4 w-4 text-slate-400" />
                                <span>{currentLecture.groupInfo}</span>
                              </div>
                            )}
                          </div>

                          {/* Already marked badge */}
                          {currentLecture?.status && (
                            <div className="mt-3">
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ${
                                  currentLecture.status === "PRESENT"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }`}
                              >
                                {currentLecture.status === "PRESENT" ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                Already marked {currentLecture.status.toLowerCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Question */}
                  <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-400 mt-5 mb-4">
                    Did you attend this lecture?
                  </p>

                  {/* Present / Absent buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleMark("PRESENT")}
                      disabled={saving}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                        currentLecture?.status === "PRESENT"
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-800/40"
                      } disabled:opacity-50`}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Present
                    </button>
                    <button
                      onClick={() => handleMark("ABSENT")}
                      disabled={saving}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                        currentLecture?.status === "ABSENT"
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/25 scale-[1.02]"
                          : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200/60 dark:border-red-800/40"
                      } disabled:opacity-50`}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      Absent
                    </button>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={goBack}
                      disabled={currentStep === 0}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Back
                    </button>

                    {/* Skip / Next if already marked */}
                    {currentLecture?.status && currentStep < lectures.length - 1 && (
                      <button
                        onClick={goNext}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        Skip
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Finish button if on last + already marked */}
                    {currentLecture?.status && currentStep === lectures.length - 1 && (
                      <button
                        onClick={() => setCompleted(true)}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                      >
                        Finish
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Mark All buttons */}
                  {lectures.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 text-center mb-2.5">Quick Actions</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMarkAll("PRESENT")}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Mark All Present
                        </button>
                        <button
                          onClick={() => handleMarkAll("ABSENT")}
                          disabled={saving}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200/60 dark:border-red-800/40 transition-colors disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                          Mark All Absent
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
