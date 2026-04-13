import { useState, useEffect, useMemo } from "react";
import { CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight, Plus, X, BookOpen, Calendar, Clock, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";
import { api } from "../services/api";
import { ATTENDANCE_STATUS } from "../constants/enums";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper: format Date to YYYY-MM-DD
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Attendance() {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [holidays, setHolidays] = useState([]);
  const [exams, setExams] = useState([]);
  const [hoverDate, setHoverDate] = useState(null);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });
  const [newExam, setNewExam] = useState({ date: "", subject: "", startTime: "", endTime: "" });
  const [subjects, setSubjects] = useState([]);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "" });
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [minPercentage, setMinPercentage] = useState(75);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Timetable data from backend
  const [timetable, setTimetable] = useState([]);
  // Selected date for lecture view — defaults to today
  const [selectedDate, setSelectedDate] = useState(today);
  // attendance: { "YYYY-MM-DD": { subjectId: { status, recordId }, ... } }
  const [attendanceMap, setAttendanceMap] = useState({});

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(selectedYear, selectedMonth, i + 1);
    return {
      label: i + 1,
      full: d.toDateString(),
      date: d,
      iso: toISODate(d),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' })
    };
  });

  // ============ DATA LOADING ============
  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [attendanceRes, subjectsRes, timetableRes] = await Promise.all([
      api.getAttendance(),
      api.getSubjects(),
      api.getTimetable()
    ]);

    if (attendanceRes.error) {
      setError(attendanceRes.error);
      setLoading(false);
      return;
    }

    // Build attendance map: { "YYYY-MM-DD": { subjectIdOrGeneral: { status, recordId } } }
    if (attendanceRes.data) {
      const map = {};
      (attendanceRes.data.records || []).forEach(record => {
        if (!record.date) return;
        const dateKey = record.date; // already YYYY-MM-DD from backend
        const subKey = record.subjectId ? String(record.subjectId) : 'general';
        if (!map[dateKey]) map[dateKey] = {};
        map[dateKey][subKey] = {
          status: record.status?.toLowerCase() || 'present',
          recordId: record.id
        };
      });
      setAttendanceMap(map);
    }

    if (subjectsRes.data) {
      setSubjects(subjectsRes.data);
    }

    if (timetableRes?.data) {
      setTimetable(timetableRes.data);
    }

    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ============ TIMETABLE FOR SELECTED DATE ============
  const selectedDayName = DAY_NAMES[selectedDate.getDay()];
  const selectedIso = toISODate(selectedDate);

  const lecturesForDay = useMemo(() => {
    return timetable
      .filter(t => t.dayOfWeek === selectedDayName)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetable, selectedDayName]);

  // ============ DATE NAVIGATION ============
  const goToPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const goToNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };
  const goToToday = () => setSelectedDate(new Date());

  // ============ ATTENDANCE ACTIONS ============
  const markAttendance = async (dateIso, status, subjectId) => {
    const subKey = subjectId ? String(subjectId) : 'general';
    const enumStatus = status === 'present' ? 'PRESENT' : 'ABSENT';

    // Optimistic update
    setAttendanceMap(prev => ({
      ...prev,
      [dateIso]: {
        ...(prev[dateIso] || {}),
        [subKey]: { status, recordId: prev[dateIso]?.[subKey]?.recordId || null }
      }
    }));

    const { data, error: apiError } = await api.markAttendance({
      date: dateIso,
      status: enumStatus,
      subjectId: subjectId || null,
      note: "",
    });

    if (apiError) {
      alert(apiError);
      await loadData(); // revert
      return;
    }

    if (data?.id) {
      setAttendanceMap(prev => ({
        ...prev,
        [dateIso]: {
          ...(prev[dateIso] || {}),
          [subKey]: { status, recordId: data.id }
        }
      }));
    }
  };

  const deleteSingleAttendance = async (dateIso, subjectId) => {
    const subKey = subjectId ? String(subjectId) : 'general';
    const recordId = attendanceMap[dateIso]?.[subKey]?.recordId;
    if (!recordId) return;

    const { error: apiError } = await api.deleteAttendance(recordId);
    if (apiError) {
      alert(apiError);
      return;
    }

    setAttendanceMap(prev => {
      const newMap = { ...prev };
      if (newMap[dateIso]) {
        const dayData = { ...newMap[dateIso] };
        delete dayData[subKey];
        if (Object.keys(dayData).length === 0) {
          delete newMap[dateIso];
        } else {
          newMap[dateIso] = dayData;
        }
      }
      return newMap;
    });
  };

  const deleteAllForDate = async (dateIso) => {
    if (!confirm(`Clear all attendance for ${new Date(dateIso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}?`)) return;

    const { error: apiError } = await api.deleteAttendanceByDate(dateIso);
    if (apiError) {
      alert(apiError);
      return;
    }

    setAttendanceMap(prev => {
      const newMap = { ...prev };
      delete newMap[dateIso];
      return newMap;
    });
  };

  const clearAllAttendance = async () => {
    if (!confirm("Are you sure you want to clear ALL marked attendance? This cannot be undone.")) return;
    const oldMap = { ...attendanceMap };
    setAttendanceMap({});
    try {
      const allIds = [];
      Object.values(oldMap).forEach(dayObj => {
        Object.values(dayObj).forEach(entry => { if (entry.recordId) allIds.push(entry.recordId); });
      });
      await Promise.all(allIds.map(id => api.deleteAttendance(id)));
    } catch (e) {
      alert("Failed to clear some records. Refreshing...");
      await loadData();
    }
  };

  // ============ CALENDAR HELPERS ============
  const isHoliday = (dateString) => holidays.some(h => h.date === dateString);
  const getHolidayName = (dateString) => holidays.find(h => h.date === dateString)?.name || "";
  const isExam = (dateString) => exams.some(e => e.date === dateString);
  const getExam = (dateString) => exams.find(e => e.date === dateString);

  const getCalendarStatus = (isoDate) => {
    const dayData = attendanceMap[isoDate];
    if (!dayData || Object.keys(dayData).length === 0) return null;
    const statuses = Object.values(dayData).map(e => e.status);
    if (statuses.every(s => s === 'present')) return 'present';
    if (statuses.every(s => s === 'absent')) return 'absent';
    return 'partial';
  };

  const addSubject = async () => {
    if (!newSubject.name) return;
    const { data, error: subError } = await api.addSubject({ name: newSubject.name, courseCode: "", professor: "" });
    if (subError) {
      alert(subError);
    } else if (data) {
      setSubjects([...subjects, data]);
      setShowAddSubject(false);
      setNewSubject({ name: "" });
    }
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
    else { setSelectedMonth(selectedMonth - 1); }
  };
  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
    else { setSelectedMonth(selectedMonth + 1); }
  };

  const addHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name) { alert("Please enter both date and holiday name"); return; }
    const dateObj = new Date(newHoliday.date);
    setHolidays([...holidays, { date: dateObj.toDateString(), name: newHoliday.name }]);
    setNewHoliday({ date: "", name: "" });
    setShowAddHoliday(false);
  };
  const deleteHoliday = async (dateString) => {
    if (confirm("Delete this holiday?")) setHolidays(holidays.filter(h => h.date !== dateString));
  };
  const addExam = async () => {
    if (!newExam.date || !newExam.subject || !newExam.startTime || !newExam.endTime) { alert("Please fill all fields"); return; }
    const dateObj = new Date(newExam.date);
    setExams([...exams, { date: dateObj.toDateString(), subject: newExam.subject, startTime: newExam.startTime, endTime: newExam.endTime }]);
    setNewExam({ date: "", subject: "", startTime: "", endTime: "" });
    setShowAddExam(false);
  };
  const deleteExam = async (dateString) => {
    if (confirm("Delete this exam?")) setExams(exams.filter(e => e.date !== dateString));
  };

  // Keyboard shortcut for calendar hover
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!hoverDate) return;
      const dateObj = new Date(hoverDate);
      if (dateObj.getDay() === 0 || dateObj.getDay() === 6 || isHoliday(hoverDate)) return;
      const key = e.key.toLowerCase();
      const iso = toISODate(dateObj);
      if (key === 'p') markAttendance(iso, "present", null);
      else if (key === 'a') markAttendance(iso, "absent", null);
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [hoverDate, attendanceMap, holidays]);

  // ============ STATS ============
  let totalLectures = 0;
  let presentLectures = 0;
  Object.values(attendanceMap).forEach(dayObj => {
    Object.values(dayObj).forEach(lecture => {
      totalLectures++;
      if (lecture.status === 'present') {
        presentLectures++;
      }
    });
  });

  const percentage = totalLectures === 0 ? 0 : Math.round((presentLectures / totalLectures) * 100);

  // Subject-wise Analysis
  const subjectAnalysis = useMemo(() => {
    return subjects.map(sub => {
      const subIdStr = String(sub.id);
      let present = 0;
      let total = 0;
      Object.keys(attendanceMap).forEach(dateStr => {
        // Only count if it was a working day (or if it was explicitly marked despite being a holiday/weekend)
        if (attendanceMap[dateStr][subIdStr]) {
          total++;
          if (attendanceMap[dateStr][subIdStr].status === 'present') present++;
        }
      });
      const pct = total === 0 ? 100 : Math.round((present / total) * 100);
      return {
        name: sub.name,
        shortName: sub.name.substring(0, 3).toUpperCase(),
        percentage: pct,
        present,
        total,
      };
    });
  }, [attendanceMap, subjects]);

  // Quick week view for day selector
  const weekDates = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay()); // go to Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate.toDateString()]);

  const dayAttendanceData = attendanceMap[selectedIso] || {};

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

      {/* ============ TIMETABLE ATTENDANCE (PRIMARY SECTION) ============ */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6">
        {/* Day Selector Bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-brand" />
            <h2 className="text-xl font-semibold">
              {isCalendarExpanded ? "Calendar" : "Today's Lectures"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsCalendarExpanded(!isCalendarExpanded)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-medium">
              {isCalendarExpanded ? "Week View" : "Month View"}
            </button>
            <button onClick={goToToday} className="text-xs px-3 py-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-all font-medium">
              Today
            </button>
            {dayAttendanceData && Object.keys(dayAttendanceData).length > 0 && !isCalendarExpanded && (
              <button
                onClick={() => deleteAllForDate(selectedIso)}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors font-medium flex items-center gap-1"
              >
                <Trash2 size={14} /> Clear Day
              </button>
            )}
            {Object.keys(attendanceMap).length > 0 && isCalendarExpanded && (
              <button onClick={clearAllAttendance}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors font-medium flex items-center gap-1">
                <Trash2 size={14} /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* View Component (Week or Month) */}
        {!isCalendarExpanded ? (
          <div className="flex items-center gap-2 mb-6">
            <button onClick={goToPrevDay} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 grid grid-cols-7 gap-1.5">
              {weekDates.map((d, i) => {
                const iso = toISODate(d);
                const isSelected = iso === selectedIso;
                const isToday = iso === toISODate(new Date());
                const calStatus = getCalendarStatus(iso);
                const holName = getHolidayName(d.toDateString());
                const exam = getExam(d.toDateString());
                
                return (
                  <button
                    key={iso}
                    onClick={() => setSelectedDate(d)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all text-xs font-medium relative overflow-hidden flex-1
                      ${isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 ring-2 ring-brand ring-offset-2 dark:ring-offset-slate-900 z-10'
                        : isToday
                        ? 'bg-brand/10 dark:bg-brand/20 text-brand border border-brand/40 ring-1 ring-brand/30 dark:ring-brand/40'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-transparent'
                      }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-wider opacity-70">{DAY_LABELS[i]}</span>
                      <span className={`text-lg font-bold mt-0.5 ${isToday ? 'text-brand dark:text-white' : ''}`}>{d.getDate()}</span>
                      {isToday && <span className="text-[8px] font-black text-brand uppercase mt-0.5">Today</span>}
                    </div>
                    
                    {/* Indicators */}
                    <div className="flex gap-0.5 mt-1 h-1.5">
                      {holName && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" title={`Holiday: ${holName}`} />}
                      {exam && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" title={`Exam: ${exam.subject}`} />}
                      {calStatus && !holName && !exam && (
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          calStatus === 'present' ? 'bg-green-500' : calStatus === 'absent' ? 'bg-red-500' : 'bg-brand'
                        }`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={goToNextDay} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">
                {monthNames[selectedMonth]} {selectedYear}
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={goToPreviousMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-2 py-1 text-xs border-none bg-transparent outline-none cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-2 py-1 text-xs border-none bg-transparent outline-none cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  {Array.from({ length: 10 }, (_, i) => today.getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={goToNextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] uppercase tracking-wider font-semibold text-slate-500">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1.5 relative [grid-auto-rows:1fr]">
              {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
               {dates.map((d) => {
                const calStatus = getCalendarStatus(d.iso);
                const isHol = isHoliday(d.full);
                const holidayName = getHolidayName(d.full);
                const hasExam = isExam(d.full);
                const exam = getExam(d.full);
                const isSelectedInCal = d.iso === selectedIso;
                const isToday = d.iso === toISODate(new Date());
                const activeHoverState = isHol || d.isWeekend ? '' : 'hover:border-brand/40 hover:bg-slate-50 dark:hover:bg-slate-800/50';
                
                return (
                  <div key={d.full} className="relative aspect-square w-full">
                    <button
                      onClick={() => { if (!d.isWeekend && !isHol) setSelectedDate(d.date); }}
                      disabled={d.isWeekend || isHol}
                      className={`absolute inset-0 w-full h-full rounded-xl flex flex-col items-center justify-start p-1 border transition-all text-sm overflow-hidden
                        ${isSelectedInCal ? 'ring-2 ring-brand border-transparent z-10' : activeHoverState}
                        ${isToday ? 'ring-2 ring-brand/30 dark:ring-brand/50 border-brand/50 bg-brand/5 dark:bg-brand/20' : ''}
                        ${d.isWeekend ? 'bg-slate-100/50 dark:bg-slate-800/30 border-transparent text-slate-400 cursor-not-allowed' 
                        : isHol ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 text-amber-600 cursor-not-allowed'
                        : hasExam ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/50 text-purple-700 dark:text-purple-400'
                        : calStatus === 'present' ? 'bg-slate-900 dark:bg-slate-100 border-transparent text-white dark:text-slate-900 shadow-sm'
                        : calStatus === 'absent' ? 'bg-slate-200 dark:bg-slate-800 border-transparent text-slate-500 opacity-80'
                        : calStatus === 'partial' ? 'bg-brand/10 border-brand/20 text-brand'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}
                      `}
                      title={isHol ? `Holiday: ${holidayName}` : hasExam ? `Exam: ${exam.subject} (${exam.startTime} - ${exam.endTime})` : ""}
                    >
                      <div className="flex items-center justify-between w-full px-1 mb-1">
                        <span className={`font-bold text-[11px] leading-tight ${isToday ? 'text-brand dark:text-white' : 'text-slate-900 dark:text-slate-100'}`}>{d.label}</span>
                        {isToday && (
                          <span className="text-[9px] font-black bg-brand text-white dark:bg-white dark:text-brand px-1 rounded uppercase tracking-tighter">
                            Today
                          </span>
                        )}
                      </div>
                      
                      <div className="w-full flex-1 mt-0.5 flex flex-col min-h-0 gap-0.5 overflow-hidden">
                        {isHol && (
                          <div className="flex-1 w-full bg-amber-100 dark:bg-amber-900/40 rounded flex items-center justify-center p-0.5 min-h-0">
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 truncate w-full text-center">
                              {holidayName}
                            </span>
                          </div>
                        )}
                        {hasExam && (
                          <div className="flex-1 w-full bg-purple-100 dark:bg-purple-900/40 rounded flex flex-col items-center justify-center p-0.5 min-h-0">
                            <span className="text-[9px] font-bold text-purple-800 dark:text-purple-300 truncate w-full text-center">{exam.subject}</span>
                            <span className="text-[8px] font-semibold text-purple-600 dark:text-purple-400 truncate w-full text-center leading-tight">{exam.startTime}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Date Label */}
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 font-medium">
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        {/* Banners for Holidays/Exams on Selected Date */}
        {isHoliday(selectedIso) && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 text-amber-600">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-300">Public Holiday</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">{getHolidayName(selectedDate.toDateString())}</p>
            </div>
          </div>
        )}
        {isExam(selectedDate.toDateString()) && (
          <div className="mb-4 p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 text-purple-600">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="font-semibold text-purple-900 dark:text-purple-300">Exam Scheduled</p>
              <p className="text-sm text-purple-700 dark:text-purple-400 font-medium whitespace-pre-wrap">
                {getExam(selectedDate.toDateString())?.subject} ({getExam(selectedDate.toDateString())?.startTime} - {getExam(selectedDate.toDateString())?.endTime})
              </p>
            </div>
          </div>
        )}

        {/* Lectures List */}
        <div className="space-y-3">
          {lecturesForDay.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No lectures scheduled for this day</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add lectures in the Timetable module</p>
            </div>
          ) : (
            lecturesForDay.map((lecture, i) => {
              const subId = lecture.subjectId ? String(lecture.subjectId) : null;
              const entryKey = subId || 'general';
              const entry = dayAttendanceData[entryKey];
              const status = entry?.status || null;

              return (
                <motion.div
                  key={lecture.id || i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border transition-all
                    ${status === 'present'
                      ? 'bg-slate-900/5 dark:bg-white/5 border-slate-900/20 dark:border-white/20'
                      : status === 'absent'
                      ? 'bg-slate-100 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-70'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                >
                  {/* Lecture Info */}
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all
                      ${status === 'present'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : status === 'absent'
                        ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        : 'bg-brand/10 text-brand'
                      }`}
                    >
                      {lecture.subjectName ? lecture.subjectName.substring(0, 2).toUpperCase() : "??"}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                        {lecture.subjectName || "Unnamed Subject"}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={12} /> {lecture.startTime} – {lecture.endTime}
                        </span>
                        {lecture.roomNumber && (
                          <span className="text-xs text-slate-400">Rm: {lecture.roomNumber}</span>
                        )}
                        {lecture.professor && (
                          <span className="text-xs text-slate-400">{lecture.professor}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* P / A Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => markAttendance(selectedIso, "present", subId)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5
                        ${status === 'present'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                    >
                      <CheckCircle size={15} /> P
                    </button>
                    <button
                      onClick={() => markAttendance(selectedIso, "absent", subId)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5
                        ${status === 'absent'
                          ? 'bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-white shadow-inner'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-700'
                        }`}
                    >
                      <XCircle size={15} /> A
                    </button>
                    {status && (
                      <button
                        onClick={() => deleteSingleAttendance(selectedIso, subId)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                        title="Clear this lecture's attendance"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ============ PERCENTAGE CARD ============ */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total Lectures Attendance</p>
        <p className="text-4xl font-bold mt-1">{percentage}%</p>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 mt-4">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${percentage}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Total Lectures</p>
            <p className="font-bold text-slate-900 dark:text-slate-100">{totalLectures}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Attended</p>
            <p className="font-bold text-green-600">{presentLectures}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Missed</p>
            <p className="font-bold text-red-600">{totalLectures - presentLectures}</p>
          </div>
        </div>
      </div>

      {/* ============ SUBJECT ANALYSIS GRAPH ============ */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
              <BarChart2 className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Subject Analysis</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Attendance distribution across your subjects</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1.5 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 ml-2">Min. Required:</span>
            <input 
              type="number" 
              value={minPercentage} 
              onChange={(e) => setMinPercentage(Number(e.target.value))} 
              className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-center text-sm font-semibold py-1 focus:outline-none focus:border-brand"
              min="0" max="100"
            />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-2">%</span>
          </div>
        </div>

        {subjectAnalysis.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No subject data available to analyze.</p>
        ) : (
          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectAnalysis} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(val) => `${val}%`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isDanger = data.percentage < minPercentage;
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                          <p className="font-bold text-sm mb-1">{data.name}</p>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-lg ${isDanger ? 'text-red-500' : 'text-green-500'}`}>{data.percentage}%</span>
                            <span className="text-xs text-slate-500">({data.present}/{data.total} days)</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={minPercentage} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Min', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                <Bar dataKey="percentage" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {subjectAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.percentage >= minPercentage ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ============ EXAMS ============ */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Exams</h2>
          <button onClick={() => setShowAddExam(!showAddExam)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all text-sm font-medium">
            {showAddExam ? <X size={16} /> : <Plus size={16} />}
            {showAddExam ? "Cancel" : "Add Exam"}
          </button>
        </div>

        {showAddExam && (
          <div className="mb-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
                <input type="date" value={newExam.date} onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                <input type="text" value={newExam.subject} onChange={(e) => setNewExam({ ...newExam, subject: e.target.value })} placeholder="e.g., Mathematics"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
                <input type="time" value={newExam.startTime} onChange={(e) => setNewExam({ ...newExam, startTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">End Time</label>
                <input type="time" value={newExam.endTime} onChange={(e) => setNewExam({ ...newExam, endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
            </div>
            <button onClick={addExam} className="mt-3 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-all text-sm font-medium">
              Add Exam
            </button>
          </div>
        )}

        <div className="space-y-2">
          {exams.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No exams scheduled yet</p>
          ) : (
            exams.sort((a, b) => new Date(a.date) - new Date(b.date)).map((exam, index) => (
              <div key={index} className="flex justify-between items-center rounded-xl p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 group hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-purple-900 dark:text-purple-300">{exam.subject}</p>
                    <p className="text-xs text-purple-700 dark:text-purple-400">{exam.date} • {exam.startTime} - {exam.endTime}</p>
                  </div>
                </div>
                <button onClick={() => deleteExam(exam.date)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-all" title="Delete exam">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============ HOLIDAYS ============ */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Public Holidays</h2>
          <button onClick={() => setShowAddHoliday(!showAddHoliday)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand/10 text-brand hover:bg-brand/20 transition-all text-sm font-medium">
            {showAddHoliday ? <X size={16} /> : <Plus size={16} />}
            {showAddHoliday ? "Cancel" : "Add Holiday"}
          </button>
        </div>

        {showAddHoliday && (
          <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
                <input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Holiday Name</label>
                <input type="text" value={newHoliday.name} onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })} placeholder="e.g., Diwali"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
            </div>
            <button onClick={addHoliday}
              className="mt-3 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-black hover:opacity-90 transition-all text-sm font-medium">
              Add Holiday
            </button>
          </div>
        )}

        <div className="space-y-2">
          {holidays.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No holidays added yet</p>
          ) : (
            holidays.map((holiday, index) => (
              <div key={index} className="flex justify-between items-center rounded-xl p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{holiday.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{holiday.date}</p>
                </div>
                <button onClick={() => deleteHoliday(holiday.date)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 transition-all" title="Delete holiday">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============ RECENT HISTORY ============ */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Attendance</h2>
        <div className="space-y-2">
          {Object.keys(attendanceMap).length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No attendance records yet</p>
          ) : (
            Object.entries(attendanceMap)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 10)
              .map(([dateKey, dayData]) => {
                const statuses = Object.values(dayData).map(e => e.status);
                const summary = statuses.every(s => s === 'present') ? 'PRESENT'
                  : statuses.every(s => s === 'absent') ? 'ABSENT'
                  : 'PARTIAL';
                const dateLabel = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                return (
                  <div key={dateKey}
                    className="flex justify-between items-center rounded-xl p-3 bg-slate-100 dark:bg-slate-800/60 border dark:border-slate-700 group hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => {
                      const d = new Date(dateKey + 'T00:00:00');
                      setSelectedDate(d);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="flex-1">
                      <span className="font-medium text-sm">{dateLabel}</span>
                      <span className="text-xs text-slate-400 ml-2">({Object.keys(dayData).length} lecture{Object.keys(dayData).length > 1 ? 's' : ''})</span>
                    </div>
                    <span className={`font-semibold text-sm mr-2 ${
                      summary === 'PRESENT' ? "text-slate-900 dark:text-white"
                        : summary === 'ABSENT' ? "text-slate-400 dark:text-slate-500"
                        : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {summary}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); deleteAllForDate(dateKey); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-all" title="Delete attendance">
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* ============ ADD SUBJECT MODAL ============ */}
      <AnimatePresence>
        {showAddSubject && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[60]"
              onClick={() => setShowAddSubject(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl z-[70] p-6 border dark:border-slate-800">
              <h3 className="text-lg font-bold mb-4">Add New Subject</h3>
              <input type="text" value={newSubject.name} onChange={(e) => setNewSubject({ name: e.target.value })}
                placeholder="Subject Name"
                className="w-full px-4 py-3 rounded-xl border dark:border-slate-700 bg-transparent mb-4 focus:ring-2 focus:ring-brand outline-none" autoFocus />
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAddSubject(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
                <button onClick={addSubject}
                  className="px-4 py-2 text-sm font-medium bg-brand text-white rounded-xl hover:bg-brand-dark">Create Subject</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
