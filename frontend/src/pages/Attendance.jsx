import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight, Plus, X, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import { ATTENDANCE_STATUS } from "../constants/enums";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

export default function Attendance() {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [attendance, setAttendance] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [exams, setExams] = useState([]);
  const [hoverDate, setHoverDate] = useState(null);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });
  const [newExam, setNewExam] = useState({ date: "", subject: "", startTime: "", endTime: "" });
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "" });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(selectedYear, selectedMonth, i + 1);
    const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
    return {
      label: i + 1,
      full: d.toDateString(),
      date: d,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' })
    };
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Map to store attendance record IDs for deletion
  const [attendanceIds, setAttendanceIds] = useState({});

  // Load data from backend on mount
  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [attendanceRes, subjectsRes] = await Promise.all([
      api.getAttendance(),
      api.getSubjects()
    ]);

    if (attendanceRes.error) {
      setError(attendanceRes.error);
      setLoading(false);
      return;
    }

    if (attendanceRes.data) {
      const attendanceMap = {};
      const idMap = {};
      const subjectMap = {};
      (attendanceRes.data.records || []).forEach(record => {
        if (!record.date) return;
        const [year, month, day] = record.date.split('-');
        const dateObj = new Date(year, month - 1, day);
        const dateString = dateObj.toDateString();
        attendanceMap[dateString] = record.status?.toLowerCase() || 'present';
        idMap[dateString] = record.id;
        if (record.subjectId) {
          subjectMap[dateString] = { id: record.subjectId, name: record.subjectName };
        }
      });
      setAttendance(attendanceMap);
      setAttendanceIds(idMap);
    }

    if (subjectsRes.data) {
      setSubjects(subjectsRes.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isHoliday = (dateString) => {
    return holidays.some(h => h.date === dateString);
  };

  const getHolidayName = (dateString) => {
    const holiday = holidays.find(h => h.date === dateString);
    return holiday ? holiday.name : "";
  };

  const isExam = (dateString) => {
    return exams.some(e => e.date === dateString);
  };

  const getExam = (dateString) => {
    return exams.find(e => e.date === dateString);
  };

  const markAttendance = async (date, status) => {
    // Generate optimistic states
    const prevAttendance = { ...attendance };
    setAttendance(prev => ({ ...prev, [date]: status }));

    // Securely extract local YYYY-MM-DD
    const dateObj = new Date(date);
    const localYear = dateObj.getFullYear();
    const localMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
    const localDay = String(dateObj.getDate()).padStart(2, '0');
    const isoDate = `${localYear}-${localMonth}-${localDay}`;
    const enumStatus = status === 'present' ? 'PRESENT' : 'ABSENT';

    const { data, error: apiError } = await api.markAttendance({
      date: isoDate,
      status: enumStatus,
      subjectId: selectedSubjectId || null,
      note: "",
    });

    if (apiError) {
      alert(apiError);
      setAttendance(prevAttendance);
      return;
    }

    if (data?.id) {
      setAttendanceIds(prev => ({ ...prev, [date]: data.id }));
    }
  };

  const deleteAttendance = async (date) => {
    if (confirm(`Are you sure you want to delete attendance for ${date}?`)) {
      const recordId = attendanceIds[date];
      if (recordId) {
        const { error: apiError } = await api.deleteAttendance(recordId);
        if (apiError) {
          alert(apiError);
          return;
        }
      }
      const newAttendance = { ...attendance };
      delete newAttendance[date];
      setAttendance(newAttendance);
      const newIds = { ...attendanceIds };
      delete newIds[date];
      setAttendanceIds(newIds);
    }
  };

  const addSubject = async () => {
    if (!newSubject.name) return;
    const { data, error: subError } = await api.addSubject({ name: newSubject.name, courseCode: "", professor: "" });
    if (subError) {
      alert(subError);
    } else if (data) {
      setSubjects([...subjects, data]);
      setSelectedSubjectId(data.id);
      setShowAddSubject(false);
      setNewSubject({ name: "" });
    }
  };

  const clearAllAttendance = async () => {
    if (!confirm("Are you sure you want to clear ALL marked attendance? This cannot be undone.")) return;
    
    setAttendance({});
    const oldIds = { ...attendanceIds };
    setAttendanceIds({});
    
    try {
      const promises = Object.values(oldIds).map(id => api.deleteAttendance(id));
      await Promise.all(promises);
    } catch (e) {
      alert("Failed to clear some attendance records. Page will refresh.");
      await loadData();
    }
  };

  const addHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name) {
      alert("Please enter both date and holiday name");
      return;
    }

    const dateObj = new Date(newHoliday.date);
    const dateString = dateObj.toDateString();

    // Holidays are stored locally (no backend calendar endpoint in current API)
    setHolidays([...holidays, { date: dateString, name: newHoliday.name }]);
    setNewHoliday({ date: "", name: "" });
    setShowAddHoliday(false);
  };

  const deleteHoliday = async (dateString) => {
    if (confirm("Are you sure you want to delete this holiday?")) {
      try {
        // Note: You'll need to store event IDs to delete properly
        setHolidays(holidays.filter(h => h.date !== dateString));
      } catch (error) {
        console.error('Failed to delete holiday:', error);
      }
    }
  };

  const addExam = async () => {
    if (!newExam.date || !newExam.subject || !newExam.startTime || !newExam.endTime) {
      alert("Please enter date, subject, start time, and end time");
      return;
    }

    const dateObj = new Date(newExam.date);
    const dateString = dateObj.toDateString();

    // Exams are stored locally (no backend calendar endpoint in current API)
    setExams([...exams, {
      date: dateString,
      subject: newExam.subject,
      startTime: newExam.startTime,
      endTime: newExam.endTime
    }]);
    setNewExam({ date: "", subject: "", startTime: "", endTime: "" });
    setShowAddExam(false);
  };

  const deleteExam = async (dateString) => {
    if (confirm("Are you sure you want to delete this exam?")) {
      try {
        // Note: You'll need to store event IDs to delete properly
        setExams(exams.filter(e => e.date !== dateString));
      } catch (error) {
        console.error('Failed to delete exam:', error);
      }
    }
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Keyboard event handler for P/A keys
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!hoverDate) return;
      
      const dateObj = new Date(hoverDate);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      if (isWeekend || isHoliday(hoverDate)) return;

      const key = e.key.toLowerCase();
      if (key === 'p') {
        markAttendance(hoverDate, "present");
      } else if (key === 'a') {
        markAttendance(hoverDate, "absent");
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [hoverDate, attendance, attendanceIds, holidays, selectedSubjectId]);

  // Calculate attendance percentage (excluding weekends and holidays)
  const workingDays = dates.filter(d => !d.isWeekend && !isHoliday(d.full));
  const markedWorkingDays = workingDays.filter(d => attendance[d.full]);
  const presentDays = markedWorkingDays.filter(d => attendance[d.full] === "present").length;
  const totalMarked = markedWorkingDays.length;
  const percentage = totalMarked === 0 ? 0 : Math.round((presentDays / totalMarked) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 relative"
    >
      <h1 className="text-3xl font-bold mb-2">Attendance</h1>

      {loading && <LoadingSpinner message="Loading attendance..." />}
      {error && <ErrorMessage message={error} onRetry={loadData} />}

      {/* Percentage Card */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Attendance Percentage
        </p>
        <p className="text-4xl font-bold mt-1">{percentage}%</p>

        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 mt-4">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Working Days</p>
            <p className="font-bold text-slate-900 dark:text-slate-100">{workingDays.length}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Present</p>
            <p className="font-bold text-green-600">{presentDays}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Absent</p>
            <p className="font-bold text-red-600">{totalMarked - presentDays}</p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6 relative">
        {/* Month/Year Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Calendar</h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand outline-none"
              >
                <option value="">All Subjects</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowAddSubject(true)}
                className="p-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-all"
                title="Add New Subject"
              >
                <Plus size={16} />
              </button>
            </div>
            {Object.keys(attendance).length > 0 && (
              <button
                onClick={clearAllAttendance}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors font-medium flex items-center gap-1"
              >
                <Trash2 size={14} />
                Clear All
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
              >
                {Array.from({ length: 10 }, (_, i) => today.getFullYear() - 5 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 relative">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {dates.map((d) => {
            const status = attendance[d.full];
            const isHol = isHoliday(d.full);
            const holidayName = getHolidayName(d.full);
            const hasExam = isExam(d.full);
            const exam = getExam(d.full);

            return (
              <div
                key={d.full}
                className="relative aspect-square"
                onMouseEnter={() => setHoverDate(d.full)}
                onMouseLeave={() => setHoverDate(null)}
              >
                <button
                  disabled={d.isWeekend || isHol}
                  className={`w-full h-full rounded-xl p-2 text-sm border transition-all relative flex flex-col items-center justify-start
                    ${
                      d.isWeekend
                        ? "bg-slate-200/50 dark:bg-slate-800/50 border-slate-300/30 dark:border-slate-700/30 text-slate-400 cursor-not-allowed"
                        : isHol
                        ? "bg-amber-100/50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 cursor-not-allowed"
                        : hasExam
                        ? "bg-purple-100/50 dark:bg-purple-900/20 border-purple-400 dark:border-purple-600 text-purple-800 dark:text-purple-300"
                        : status === "present"
                        ? "bg-green-500/20 border-green-500 text-green-800 dark:text-green-300"
                        : status === "absent"
                        ? "bg-red-500/20 border-red-500 text-red-800 dark:text-red-300"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-300/30 dark:border-slate-700 hover:border-brand"
                    }
                  `}
                  title={isHol ? holidayName : hasExam ? `${exam.subject} - ${exam.startTime} to ${exam.endTime}` : d.isWeekend ? `${d.dayName} - Weekend` : ""}
                >
                  <span className="font-semibold text-base">{d.label}</span>
                  {d.isWeekend && <span className="text-[8px] mt-0.5">OFF</span>}
                  {isHol && <span className="text-[8px] mt-0.5">HOL</span>}
                  {hasExam && (
                    <div className="mt-1 w-full">
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold truncate">{exam.subject}</span>
                      </div>
                      <span className="text-xs font-semibold block">{exam.startTime}-{exam.endTime}</span>
                    </div>
                  )}
                </button>

                {/* Hover Menu - only for working days */}
                {hoverDate === d.full && !d.isWeekend && !isHol && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30
                                  bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                                  shadow-lg rounded-xl px-3 py-2 animate-fadeIn">
                    <div className="flex gap-2">
                      <button
                        onClick={() => markAttendance(d.full, "present")}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md
                                   bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/30"
                      >
                        <CheckCircle size={14} /> P
                      </button>

                      <button
                        onClick={() => markAttendance(d.full, "absent")}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md
                                   bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-500/30"
                      >
                        <XCircle size={14} /> A
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 text-center">
                      Press P or A
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500"></div>
            <span className="text-slate-600 dark:text-slate-400">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500"></div>
            <span className="text-slate-600 dark:text-slate-400">Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300"></div>
            <span className="text-slate-600 dark:text-slate-400">Weekend</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/20 border border-amber-300"></div>
            <span className="text-slate-600 dark:text-slate-400">Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/20 border border-purple-400"></div>
            <span className="text-slate-600 dark:text-slate-400">Exam</span>
          </div>
        </div>
      </div>

      {/* Exams Section */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Exams</h2>
          <button
            onClick={() => setShowAddExam(!showAddExam)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all text-sm font-medium"
          >
            {showAddExam ? <X size={16} /> : <Plus size={16} />}
            {showAddExam ? "Cancel" : "Add Exam"}
          </button>
        </div>

        {/* Add Exam Form */}
        {showAddExam && (
          <div className="mb-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newExam.date}
                  onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={newExam.subject}
                  onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })}
                  placeholder="e.g., Mathematics, Physics"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={newExam.startTime}
                  onChange={(e) => setNewExam({ ...newExam, startTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={newExam.endTime}
                  onChange={(e) => setNewExam({ ...newExam, endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
            </div>
            <button
              onClick={addExam}
              className="mt-3 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-all text-sm font-medium"
            >
              Add Exam
            </button>
          </div>
        )}

        {/* Exams List */}
        <div className="space-y-2">
          {exams.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              No exams scheduled yet
            </p>
          ) : (
            exams
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((exam, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center rounded-xl p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 group hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-purple-900 dark:text-purple-300">{exam.subject}</p>
                      <p className="text-xs text-purple-700 dark:text-purple-400">
                        {exam.date} • {exam.startTime} - {exam.endTime}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteExam(exam.date)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-all"
                    title="Delete exam"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Public Holidays */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Public Holidays</h2>
          <button
            onClick={() => setShowAddHoliday(!showAddHoliday)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand/10 text-brand hover:bg-brand/20 transition-all text-sm font-medium"
          >
            {showAddHoliday ? <X size={16} /> : <Plus size={16} />}
            {showAddHoliday ? "Cancel" : "Add Holiday"}
          </button>
        </div>

        {/* Add Holiday Form */}
        {showAddHoliday && (
          <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Holiday Name
                </label>
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  placeholder="e.g., Diwali, Independence Day"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
            </div>
            <button
              onClick={addHoliday}
              className="mt-3 px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark transition-all text-sm font-medium"
            >
              Add Holiday
            </button>
          </div>
        )}

        {/* Holidays List */}
        <div className="space-y-2">
          {holidays.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              No holidays added yet
            </p>
          ) : (
            holidays.map((holiday, index) => (
              <div
                key={index}
                className="flex justify-between items-center rounded-xl p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 group hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-300">{holiday.name}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">{holiday.date}</p>
                </div>
                <button
                  onClick={() => deleteHoliday(holiday.date)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-all"
                  title="Delete holiday"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent History */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Attendance</h2>

        <div className="space-y-2">
          {Object.keys(attendance)
            .slice(-7)
            .reverse()
            .map((date) => (
              <div
                key={date}
                className="flex justify-between items-center rounded-xl p-3 bg-slate-100 dark:bg-slate-800/60 border dark:border-slate-700 group hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="flex-1">{date}</span>
                <span
                  className={`font-semibold mr-2 ${
                    attendance[date] === "present" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {attendance[date].toUpperCase()}
                </span>
                <button
                  onClick={() => deleteAttendance(date)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-all"
                  title="Delete attendance"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
        </div>
      </div>
      {/* Subject Modal */}
      <AnimatePresence>
        {showAddSubject && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
              onClick={() => setShowAddSubject(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl z-[70] p-6 border dark:border-slate-800"
            >
              <h3 className="text-lg font-bold mb-4">Add New Subject</h3>
              <input
                type="text"
                value={newSubject.name}
                onChange={(e) => setNewSubject({ name: e.target.value })}
                placeholder="Subject Name"
                className="w-full px-4 py-3 rounded-xl border dark:border-slate-700 bg-transparent mb-4 focus:ring-2 focus:ring-brand outline-none"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddSubject(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={addSubject}
                  className="px-4 py-2 text-sm font-medium bg-brand text-white rounded-xl hover:bg-brand-dark"
                >
                  Create Subject
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
