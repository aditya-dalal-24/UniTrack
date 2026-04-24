import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Edit2,
  Trash2,
  Clock,
  BookOpen,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Circle,
  BarChart2,
  Grid,
  User,
  MapPin,
  Users
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";
import { api } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import TimetableUploadModal from "../components/TimetableUploadModal";

// const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Helper: format Date to YYYY-MM-DD
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const defaultTimeSlots = [
  { id: 1, start: "09:00", end: "10:00" },
  { id: 2, start: "10:00", end: "11:00" },
  { id: 3, start: "11:00", end: "12:00" },
  { id: 4, start: "12:00", end: "13:00" },
  { id: 5, start: "13:00", end: "14:00" },
  { id: 6, start: "14:00", end: "15:00" },
  { id: 7, start: "15:00", end: "16:00" },
  { id: 8, start: "16:00", end: "17:00" },
  { id: 9, start: "17:00", end: "18:00" },
];

export default function Schedule() {
  const [activeTab, setActiveTab] = useState("daily");
  
  // Shared Timetable/Template State
  const [subjects, setSubjects] = useState([]);
  const [timeSlots, setTimeSlots] = useState(() => {
    const saved = localStorage.getItem("timetable_timeslots");
    return saved ? JSON.parse(saved) : defaultTimeSlots;
  });
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const days = useMemo(() => {
    const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return allDays.filter(day => {
      // Always show weekdays
      if (!["Saturday", "Sunday"].includes(day)) return true;
      
      // For weekends, check if there's any non-break subject
      const hasSubject = Object.entries(timetable).some(([key, classData]) => {
        return key.startsWith(day) && classData && !classData.isBreak;
      });
      return hasSubject;
    });
  }, [timetable]);

  // Setup specific state
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showEditTimeSlots, setShowEditTimeSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState({});
  const [showSubjectsBar, setShowSubjectsBar] = useState(false);

  const [newSubject, setNewSubject] = useState({ name: "", fullName: "", color: "#6366f1", professor: "", roomNumber: "" });
  const [newClass, setNewClass] = useState({
    subject: "", professor: "", courseCode: "", courseName: "", room: "",
  });
  const [newTimeSlot, setNewTimeSlot] = useState({ start: "", end: "" });

  // Daily Attendance specific state
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]); 
  const [dailyRecords, setDailyRecords] = useState({}); // slotId -> record (status, id)
  
  // Calendar specific state
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [isLecturesExpanded, setIsLecturesExpanded] = useState(true);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [overallSummary, setOverallSummary] = useState(null); // to store percentages
  const [minPercentage, setMinPercentage] = useState("75");
  const [selectedAnalysisSubId, setSelectedAnalysisSubId] = useState("overall");
  
  const [holidays, setHolidays] = useState(() => {
    const saved = localStorage.getItem("uniTrackHolidays");
    return saved ? JSON.parse(saved) : [];
  });
  const [exams, setExams] = useState(() => {
    const saved = localStorage.getItem("uniTrackExams");
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });
  const [newExam, setNewExam] = useState({ date: "", subject: "", startTime: "", endTime: "" });

  // Global attendance map for calendar rendering natively
  // { "YYYY-MM-DD": { subjectIdOrGeneral: { status, recordId } } }
  const [attendanceMap, setAttendanceMap] = useState({});

  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => { localStorage.setItem("timetable_timeslots", JSON.stringify(timeSlots)); }, [timeSlots]);
  useEffect(() => { localStorage.setItem("uniTrackHolidays", JSON.stringify(holidays)); }, [holidays]);
  useEffect(() => { localStorage.setItem("uniTrackExams", JSON.stringify(exams)); }, [exams]);

  const loadBackendData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    
    // Fetch overall attendance map AND subjects AND timetable concurrently
    const [attRes, subRes, slotRes] = await Promise.all([
       api.getAttendance(), // GET without date gets all for summary map
       api.getSubjects(),
       api.getTimetable()
    ]);

    if (subRes.data) {
      const colors = ["#6366f1", "#f472b6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
      setSubjects(subRes.data.map((s, i) => ({
        id: s.id, name: s.name, fullName: s.fullName, color: s.color || colors[i % colors.length],
        courseCode: s.courseCode, professor: s.professor, roomNumber: s.roomNumber,
      })));
    }

    if (slotRes.data) {
      const sortedSlots = [...slotRes.data].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const timetableObj = {};
      sortedSlots.forEach(slot => {
        // Normalize day to Title Case (backend sends UPPERCASE, frontend uses "Monday" etc.)
        const day = slot.dayOfWeek.charAt(0).toUpperCase() + slot.dayOfWeek.slice(1).toLowerCase();
        const key = `${day}-${slot.startTime}`;
        const newClass = {
          backendId: slot.id, subject: slot.subjectName, subjectId: slot.subjectId,
          professor: slot.professor, courseCode: slot.courseCode, room: slot.roomNumber,
          groupInfo: slot.groupInfo, isBreak: slot.isBreak,
          startTime: slot.startTime, endTime: slot.endTime
        };
        if (timetableObj[key]) {
            if (!Array.isArray(timetableObj[key])) timetableObj[key] = [timetableObj[key]];
            timetableObj[key].push(newClass);
        } else {
            timetableObj[key] = newClass;
        }
      });
      setTimetable(timetableObj);

      const uniqueTimes = [];
      const seen = new Set();
      const currentSavedSlots = localStorage.getItem("timetable_timeslots");
      const baseSlots = currentSavedSlots ? JSON.parse(currentSavedSlots) : (sortedSlots.length === 0 ? defaultTimeSlots : []);

      // Include locally-saved time slots
      baseSlots.forEach(ts => {
        const key = `${ts.start}-${ts.end}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueTimes.push({ id: ts.id || key, start: ts.start, end: ts.end });
        }
      });

      // Also include any time ranges from backend data that aren't already tracked
      sortedSlots.forEach(slot => {
        const key = `${slot.startTime}-${slot.endTime}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueTimes.push({ id: key, start: slot.startTime, end: slot.endTime });
        }
      });

      // CLEANUP: If there are multiple slots starting at the same time, keep only the shortest one.
      // This ensures the grid columns are atomic (e.g. 1-hour blocks). Longer slots (like 2-hour labs) will span across these using colSpan.
      const cleanedTimes = uniqueTimes.filter(ts => {
         const hasShorterSlot = uniqueTimes.some(other => 
            other.start === ts.start && 
            other.end < ts.end 
         );
         return !hasShorterSlot;
      });

      const sorted = cleanedTimes.sort((a, b) => a.start.localeCompare(b.start));
      setTimeSlots(sorted);
      localStorage.setItem("timetable_timeslots", JSON.stringify(sorted));
    }

    if (attRes.data) {
      // It returns an AttendanceSummaryResponse 
      setOverallSummary({
        total: attRes.data.totalWorkingDays || 0,
        present: attRes.data.presentDays || 0,
        percentage: attRes.data.attendancePercentage || 0
      });
      
      const map = {};
      (attRes.data.records || []).forEach(record => {
        if (!record.date) return;
        const dateKey = record.date; 
        const subKey = record.timetableSlotId ? String(record.timetableSlotId) : 'general';
        if (!map[dateKey]) map[dateKey] = {};
        map[dateKey][subKey] = {
          status: record.status?.toUpperCase() || 'PRESENT',
          recordId: record.id
        };
      });
      setAttendanceMap(map);
    }
    
    if (showSpinner) setLoading(false);
  };

  const loadDailyAttendance = async () => {
    // Requires selectedDate to be loaded. We can actually use attendanceMap here easily.
    const mapForDay = attendanceMap[selectedDate] || {};
    setDailyRecords(mapForDay);
  };

  useEffect(() => { loadBackendData(); }, []);
  useEffect(() => { if (activeTab === 'daily') loadDailyAttendance(); }, [selectedDate, activeTab, attendanceMap]);

  // -------------- TIMETABLE SETUP METHODS --------------

  const saveSubject = async () => {
    if (!newSubject.name) return;
    
    if (editingSubjectId) {
      const { data, error: subError } = await api.updateSubject(editingSubjectId, { ...newSubject, courseCode: newSubject.courseCode || "" });
      if (subError) alert(subError);
      else if (data) {
        setNewSubject({ name: "", fullName: "", color: "#6366f1", professor: "", roomNumber: "" });
        setShowAddSubject(false);
        setEditingSubjectId(null);
        loadBackendData(false); // Reload to reflect changes in tiles
      }
    } else {
      const { data, error: subError } = await api.addSubject({ ...newSubject, courseCode: "" });
      if (subError) alert(subError);
      else if (data) {
        setSubjects([...subjects, { ...data, color: newSubject.color }]);
        setNewSubject({ name: "", fullName: "", color: "#6366f1", professor: "", roomNumber: "" });
        setShowAddSubject(false);
      }
    }
  };

  const openEditSubject = (subject) => {
    setNewSubject({
      name: subject.name || "",
      fullName: subject.fullName || "",
      color: subject.color || "#6366f1",
      professor: subject.professor || "",
      roomNumber: subject.roomNumber || "",
      courseCode: subject.courseCode || ""
    });
    setEditingSubjectId(subject.id);
    setShowAddSubject(true);
  };

  const deleteSubject = async (id) => {
    if (!confirm("Are you sure? This will delete the subject everywhere.")) return;
    const { error } = await api.deleteSubject(id);
    if (error) alert(error);
    else { loadBackendData(false); }
  };

  const addTimeSlot = () => {
    if (newTimeSlot.start && newTimeSlot.end) {
      const updated = [...timeSlots, { id: `${newTimeSlot.start}-${newTimeSlot.end}`, start: newTimeSlot.start, end: newTimeSlot.end }];
      updated.sort((a, b) => a.start.localeCompare(b.start));
      setTimeSlots(updated);
      setNewTimeSlot({ start: "", end: "" });
    }
  };

  const removeTimeSlot = (idToRemove) => {
    setTimeSlots(timeSlots.filter((ts) => ts.id !== idToRemove));
  };

  const saveClass = async () => {
    if (!newClass.subjectId) return alert("Select a subject");
    const payload = {
      dayOfWeek: selectedSlot.day, startTime: selectedSlot.slot.start, endTime: selectedSlot.slot.end,
      subjectId: newClass.subjectId, subjectName: newClass.subject, professor: newClass.professor,
      courseCode: newClass.courseCode, roomNumber: newClass.room, groupInfo: newClass.groupInfo || ''
    };
    let result = newClass.backendId 
      ? await api.updateTimetableSlot(newClass.backendId, payload)
      : await api.addTimetableSlot(payload);
    if (result.error) alert(result.error);
    else { loadBackendData(false); setShowAddClass(false); }
  };

  const deleteClass = async (day, slotStart, backendId) => {
    const existing = timetable[`${day}-${slotStart}`];
    let idToDelete = backendId;
    if (!idToDelete) {
        if (Array.isArray(existing) && existing.length > 0) idToDelete = existing[0].backendId;
        else if (existing) idToDelete = existing.backendId;
    }
    if (idToDelete) {
      const { error } = await api.deleteTimetableSlot(idToDelete);
      if (error) alert(error); else loadBackendData(false);
    }
  };

  const clearTimetable = async () => {
    if (!confirm("Are you sure you want to completely clear the timetable? This removes all scheduled classes.")) return;
    const { error } = await api.clearTimetable();
    if (error) alert(error);
    else {
      localStorage.removeItem("timetable_timeslots");
      setTimeSlots([]);
      loadBackendData(true);
    }
  };

  const clearSubjects = async () => {
    if (!confirm("Are you sure you want to clear all subjects? This will also clear the timetable and remove all related data.")) return;
    const { error } = await api.deleteAllSubjects();
    if (error) alert(error);
    else {
      localStorage.removeItem("timetable_timeslots");
      setTimeSlots([]);
      setSubjects([]);
      setTimetable({});
      loadBackendData(true);
    }
  };

  const getSubjectColor = (subjectName, subjectId = null) => {
    if (subjectId) {
      return subjects.find(s => String(s.id) === String(subjectId))?.color || "#6366f1";
    }
    return subjects.find((s) => s.name === subjectName)?.color || "#6366f1";
  };

  const getShortSubjectName = (name) => {
    if (!name) return "";
    const trimmed = name.trim();
    // Already a short abbreviation (all caps/digits, ≤8 chars, single token with optional hyphen) — keep as is
    if (/^[A-Z0-9][A-Z0-9\-]{0,7}$/.test(trimmed)) return trimmed;
    // Single word — return as-is
    const words = trimmed.split(/\s+/);
    if (words.length === 1) return trimmed;
    // Multi-word: build abbreviation from first letters, skipping stop words
    const stopWords = new Set(["AND", "OF", "THE", "IN", "FOR", "TO", "A", "AN", "ON", "WITH"]);
    let abbr = "";
    for (let word of words) {
      const clean = word.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (!clean) continue;
      if (!stopWords.has(clean)) abbr += clean[0];
    }
    return abbr.length >= 2 ? abbr : trimmed;
  };

  // -------------- DAILY ATTENDANCE CALENDAR METHODS --------------

  const isHoliday = (dateString) => holidays.some(h => h.date === dateString);
  const getHolidayName = (dateString) => holidays.find(h => h.date === dateString)?.name || "";
  const deleteHoliday = (dateString) => { if (confirm("Delete this holiday?")) setHolidays(holidays.filter(h => h.date !== dateString)); };

  const isExam = (dateString) => exams.some(e => e.date === dateString);
  const getExam = (dateString) => exams.find(e => e.date === dateString);
  const deleteExam = (dateString) => { if (confirm("Delete this exam?")) setExams(exams.filter(e => e.date !== dateString)); };

  const getCalendarStatus = (isoDate) => {
    const dayData = attendanceMap[isoDate];
    if (!dayData || Object.keys(dayData).length === 0) return null;
    const statuses = Object.values(dayData).map(e => e.status);
    if (statuses.every(s => s === 'PRESENT')) return 'present';
    if (statuses.every(s => s === 'ABSENT')) return 'absent';
    return 'partial';
  };

  const getLecturesForDate = () => {
    const d = new Date(selectedDate);
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
    
    if (!days.includes(dayName)) return [];

    const lectures = [];
    const seenClasses = new Set();
    
    timeSlots.forEach(slot => {
      const classDataRaw = timetable[`${dayName}-${slot.start}`];
      if (classDataRaw) {
        const classes = Array.isArray(classDataRaw) ? classDataRaw : [classDataRaw];
        const validClasses = classes.filter(c => {
          const uniqueId = c.backendId || `${c.subject}-${c.startTime}`;
          if (!seenClasses.has(uniqueId)) {
            seenClasses.add(uniqueId);
            return true;
          }
          return false;
        });

        if (validClasses.length > 0) {
          // Merge identical subjects (e.g. parallel labs for G5/G6)
          const mergedClasses = [];
          const subjectMap = new Map();

          validClasses.forEach(c => {
            if (subjectMap.has(c.subject)) {
              const existing = subjectMap.get(c.subject);
              if (c.groupInfo && existing.groupInfo && !existing.groupInfo.includes(c.groupInfo)) {
                existing.groupInfo = `${existing.groupInfo}, ${c.groupInfo}`;
              }
            } else {
              const copy = { ...c };
              subjectMap.set(c.subject, copy);
              mergedClasses.push(copy);
            }
          });

          lectures.push({
            slot: { 
              start: validClasses[0].startTime || slot.start, 
              end: validClasses[0].endTime || slot.end 
            },
            classes: mergedClasses
          });
        }
      }
    });
    return lectures;
  };

  const toggleAttendanceStatus = async (slotIds, newStatus) => {
    const ids = Array.isArray(slotIds) ? slotIds : [slotIds];
    const loadingUpdates = {};
    ids.forEach(id => { loadingUpdates[id] = true; });
    
    setLoadingSlots(prev => ({ ...prev, ...loadingUpdates }));
    
    try {
      const promises = ids.map(async (slotId) => {
        const existingRecord = dailyRecords[slotId];
        if (existingRecord && existingRecord.recordId) {
          return api.updateAttendance(existingRecord.recordId, {
            date: selectedDate, status: newStatus, timetableSlotId: slotId, note: ""
          });
        } else {
          return api.markAttendance({
            date: selectedDate, status: newStatus, timetableSlotId: slotId, note: ""
          });
        }
      });

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error).map(r => r.error);
      
      if (errors.length > 0) {
        alert("Some updates failed: " + errors[0]);
      }
      
      loadBackendData(false);
    } catch (err) {
      alert("Error updating attendance: " + err.message);
    } finally {
      const finishedUpdates = {};
      ids.forEach(id => { finishedUpdates[id] = false; });
      setLoadingSlots(prev => ({ ...prev, ...finishedUpdates }));
    }
  };

  const changeDate = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
    else { setSelectedMonth(selectedMonth - 1); }
  };
  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
    else { setSelectedMonth(selectedMonth + 1); }
  };

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(selectedYear, selectedMonth, i + 1);
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
    return {
      label: i + 1, full: d.toDateString(), date: d, iso: toISODate(d),
      // Flag as weekend only if it's Sat/Sun AND not in our active days list
      isWeekend: (d.getDay() === 0 || d.getDay() === 6) && !days.includes(dayName),
    };
  });

  const slotToSubjectMap = useMemo(() => {
    const map = {};
    Object.values(timetable).forEach(t => {
       const slots = Array.isArray(t) ? t : [t];
       slots.forEach(slot => {
         map[slot.backendId] = slot.subjectId;
       });
    });
    return map;
  }, [timetable]);

  const subjectAnalysis = useMemo(() => {
    return subjects.map(sub => {
      const subIdNum = Number(sub.id);
      let present = 0;
      let total = 0;
      
      Object.values(attendanceMap).forEach(dayObj => {
        Object.entries(dayObj).forEach(([slotId, record]) => {
           if (Number(slotToSubjectMap[slotId]) === subIdNum) {
              total++;
              if (record.status === 'PRESENT') present++;
           }
        });
      });
      
      const pct = total === 0 ? 0 : Math.round((present / total) * 100);
      return {
        id: sub.id,
        name: sub.name,
        shortName: sub.name.substring(0, 5).toUpperCase(),
        percentage: pct,
        present,
        total,
      };
    });
  }, [attendanceMap, subjects, slotToSubjectMap]);

  const displayStats = useMemo(() => {
    if (selectedAnalysisSubId === "overall" && overallSummary) {
       return { percentage: overallSummary.percentage, present: overallSummary.present, total: overallSummary.total, name: "Overall" };
    }
    const target = subjectAnalysis.find(s => String(s.id) === String(selectedAnalysisSubId));
    if (target) {
       return { percentage: target.percentage, present: target.present, total: target.total, name: target.name };
    }
    return overallSummary ? { percentage: overallSummary.percentage, present: overallSummary.present, total: overallSummary.total, name: "Overall" } : null;
  }, [selectedAnalysisSubId, overallSummary, subjectAnalysis]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Schedule & Attendance</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage weekly timetable and daily presence.</p>
        </div>
        <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl w-fit relative border border-slate-200 dark:border-slate-700">
          <button onClick={() => setActiveTab("daily")} className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-200 ${ activeTab === "daily" ? "text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" }`}>
            {activeTab === "daily" && <motion.div layoutId="activeScheduleTab" className="absolute inset-0 bg-brand rounded-xl shadow-lg shadow-brand/20 -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
            <CalendarCheck className="h-4 w-4" /> Daily Attendance
          </button>
          <button onClick={() => setActiveTab("setup")} className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-200 ${ activeTab === "setup" ? "text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" }`}>
            {activeTab === "setup" && <motion.div layoutId="activeScheduleTab" className="absolute inset-0 bg-brand rounded-xl shadow-lg shadow-brand/20 -z-10" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
            <Calendar className="h-4 w-4" /> Timetable Setup
          </button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} onRetry={loadBackendData} /> : (
        <AnimatePresence mode="wait">
          {activeTab === "daily" ? (
            <motion.div key="daily" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
              
              {/* Daily Attendance Summary Stats */}
              {displayStats && (
                <div className="space-y-4">
                  <div className="flex justify-between items-end px-2">
                    <h2 className="text-xl font-bold dark:text-white">Attendance Summary</h2>
                    <select 
                      value={selectedAnalysisSubId} 
                      onChange={e => setSelectedAnalysisSubId(e.target.value)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-brand hover:cursor-pointer"
                    >
                      <option value="overall">Overall Analysis</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.professor ? `(${s.professor})` : ''}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-brand/10 dark:bg-brand/20 text-brand dark:text-brand-400 rounded-2xl"><BarChart2 className="w-6 h-6"/></div>
                      <div><p className="text-sm font-bold text-slate-500 dark:text-slate-400">{displayStats.name} Attendance</p><h3 className="text-2xl font-black dark:text-white">{displayStats.percentage}%</h3></div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl"><CheckCircle className="w-6 h-6"/></div>
                      <div><p className="text-sm font-bold text-slate-500 dark:text-slate-400">Attended Lectures</p><h3 className="text-2xl font-black dark:text-white">{displayStats.present}</h3></div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl"><Calendar className="w-6 h-6"/></div>
                      <div><p className="text-sm font-bold text-slate-500 dark:text-slate-400">Total Scheduled</p><h3 className="text-2xl font-black dark:text-white">{displayStats.total}</h3></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b dark:border-slate-800 pb-4">
                    <div 
                      className="flex items-center gap-4 cursor-pointer group" 
                      onClick={() => setIsLecturesExpanded(!isLecturesExpanded)}
                    >
                      <div className="p-2 bg-brand/10 dark:bg-brand/20 rounded-xl text-brand dark:text-brand-400 group-hover:bg-brand/20 transition-colors">
                        <Calendar className="w-5 h-5"/>
                      </div>
                      <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        {isCalendarExpanded ? 'Month View' : "Today's Lectures"}
                        {!isCalendarExpanded && (
                          isLecturesExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />
                        )}
                      </h2>
                    </div>
                    
                    <div className="flex gap-2">
                      <button onClick={() => setIsCalendarExpanded(!isCalendarExpanded)} className="text-xs px-4 py-2 font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition">
                        {isCalendarExpanded ? "Hide Calendar" : "Show Calendar"}
                      </button>
                      <button onClick={() => setShowAddHoliday(true)} className="text-xs px-4 py-2 font-bold rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition flex items-center gap-2"><Plus size={14}/> Holiday</button>
                      <button onClick={() => setShowAddExam(true)} className="text-xs px-4 py-2 font-bold rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 transition flex items-center gap-2"><Plus size={14}/> Exam</button>
                    </div>
                </div>

                <AnimatePresence>
                  {isLecturesExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {!isCalendarExpanded && (
                        <div className="flex flex-col items-center gap-2 w-full max-w-sm mb-6 mx-auto">
                            {(() => {
                              const dayName = new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long" });
                              const dayStyles = {
                                Monday: "bg-indigo-500/10 dark:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/50 shadow-indigo-500/10",
                                Tuesday: "bg-emerald-500/10 dark:bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/50 shadow-emerald-500/10",
                                Wednesday: "bg-amber-500/10 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300 border-amber-400 dark:border-amber-500/50 shadow-amber-500/10",
                                Thursday: "bg-purple-500/10 dark:bg-purple-500/30 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-500/50 shadow-purple-500/10",
                                Friday: "bg-rose-500/10 dark:bg-rose-500/30 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-500/50 shadow-rose-500/10",
                                Saturday: "bg-cyan-500/10 dark:bg-cyan-500/30 text-cyan-600 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/50 shadow-cyan-500/10",
                                Sunday: "bg-slate-500/10 dark:bg-slate-500/30 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/50 shadow-slate-500/10"
                              }[dayName] || "bg-brand/10 dark:bg-brand/30 text-brand dark:text-brand-300 border-brand/20 dark:border-brand-500/50 shadow-brand/10";
                              
                              return (
                                <div className={`px-6 py-1.5 rounded-full text-[13px] font-black uppercase tracking-[0.2em] border shadow-md mb-2 transition-all duration-300 ${dayStyles}`}>
                                  {dayName}
                                </div>
                              );
                            })()}
                            <div className="flex items-center justify-between w-full">
                                <button onClick={() => changeDate(-1)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:text-white transition"><ChevronLeft size={20}/></button>
                                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="font-bold text-lg bg-transparent border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl outline-none flex-1 mx-3 text-center dark:text-white dark:[color-scheme:dark]" />
                                <button onClick={() => changeDate(1)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:text-white transition"><ChevronRight size={20}/></button>
                            </div>
                            <button onClick={() => setSelectedDate(toISODate(new Date()))} className="w-full px-4 py-2 font-black rounded-xl transition bg-brand/10 text-brand hover:bg-brand/20 dark:bg-brand/20 dark:text-brand-300 dark:hover:bg-brand/30">Today</button>
                        </div>
                      )}

                      <AnimatePresence>
                        {isCalendarExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-8 border-b dark:border-slate-800 pb-8">
                             <div className="flex justify-between items-center mb-4 px-2">
                                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg">{monthNames[selectedMonth]} {selectedYear}</h3>
                                <div className="flex items-center gap-1">
                                   <button onClick={goToPreviousMonth} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:text-white transition"><ChevronLeft size={16}/></button>
                                   <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 text-sm border-none bg-slate-100 dark:bg-slate-800 font-bold rounded-xl text-slate-700 dark:text-slate-300 outline-none">
                                      {monthNames.map((m,i)=><option key={m} value={i}>{m}</option>)}
                                   </select>
                                   <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 text-sm border-none bg-slate-100 dark:bg-slate-800 font-bold rounded-xl text-slate-700 dark:text-slate-300 outline-none">
                                      {Array.from({length: 10}, (_, i) => today.getFullYear() - 5 + i).map(y=><option key={y} value={y}>{y}</option>)}
                                   </select>
                                   <button onClick={goToNextMonth} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:text-white transition"><ChevronRight size={16}/></button>
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-7 gap-1.5 mb-2">
                                {DAY_LABELS.map(day => <div key={day} className="text-center text-[10px] font-black uppercase text-slate-500">{day}</div>)}
                             </div>
                             
                             <div className="grid grid-cols-7 gap-2">
                                {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
                                
                                {dates.map((d) => {
                                   const calStatus = getCalendarStatus(d.iso);
                                   const isHol = isHoliday(d.full);
                                   const isExamDay = isExam(d.full);
                                   const isSelectedInCal = d.iso === selectedDate;
                                   const isTodayCal = d.iso === toISODate(new Date());
                                   
                                   return (
                                     <button key={d.full} disabled={d.isWeekend || isHol} onClick={()=>{ if (!d.isWeekend && !isHol) setSelectedDate(d.iso); }} 
                                      className={`relative aspect-square rounded-2xl flex flex-col p-2 border transition-all text-sm overflow-hidden 
                                       ${isSelectedInCal ? 'ring-2 ring-brand bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'hover:border-brand/40 bg-slate-50 dark:bg-slate-800/50'}
                                       ${d.isWeekend ? 'bg-slate-100/50 dark:bg-slate-900 border-transparent text-slate-400 cursor-not-allowed' 
                                       : isHol ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 text-amber-800'
                                       : isExamDay ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 text-purple-700'
                                       : calStatus === 'present' && !isSelectedInCal ? 'border-emerald-500/50 bg-emerald-500/10'
                                       : calStatus === 'absent' && !isSelectedInCal ? 'border-red-500/50 bg-red-500/10'
                                       : !isSelectedInCal ? 'border-slate-200 dark:border-slate-800' : ''}`}
                                     >
                                        <span className={`font-black text-xs ${isSelectedInCal?'text-white dark:text-slate-900':'dark:text-white'}`}>{d.label}</span>
                                        {isTodayCal && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand"></span>}
                                        
                                        {/* Indicators */}
                                        <div className="mt-auto w-full flex gap-1 justify-center">
                                           {isHol && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
                                           {isExamDay && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
                                           {calStatus && !isHol && !isExamDay && (
                                             <div className={`w-1.5 h-1.5 rounded-full ${calStatus==='present'?'bg-emerald-500': calStatus==='absent'?'bg-red-500':'bg-brand'}`}></div>
                                           )}
                                        </div>
                                     </button>
                                   );
                                })}
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Lecture Render Zone */}
                      <div className="space-y-4">
                        {isHoliday(new Date(selectedDate).toDateString()) ? (
                           <div className="text-center py-12 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-300 dark:border-amber-800/50">
                              <div className="text-amber-500 mb-2">🌴</div>
                              <h3 className="text-lg font-bold text-amber-800 dark:text-amber-500">Holiday: {getHolidayName(new Date(selectedDate).toDateString())}</h3>
                           </div>
                        ) : isExam(new Date(selectedDate).toDateString()) ? (
                           <div className="text-center py-12 bg-purple-50 dark:bg-purple-900/10 rounded-3xl border border-purple-200 dark:border-purple-800/50">
                              <div className="text-purple-500 mb-2">📝</div>
                              <h3 className="text-lg font-bold text-purple-700 dark:text-purple-500">Exam: {getExam(new Date(selectedDate).toDateString()).subject}</h3>
                              <p className="text-sm font-bold text-purple-600 dark:text-purple-400 opacity-70 mt-1">{getExam(new Date(selectedDate).toDateString()).startTime} - {getExam(new Date(selectedDate).toDateString()).endTime}</p>
                           </div>
                        ) : getLecturesForDate().length === 0 ? (
                          <div className="text-center py-16 text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                            <CalendarCheck size={48} className="mx-auto mb-4 opacity-20" />
                            No lectures scheduled for this day.
                          </div>
                        ) : (
                          getLecturesForDate().map(({ slot, classes }, groupIdx) => {
                            const isAnyBreak = classes.some(c => c.isBreak);
                            const realBreaks = classes.filter(c => c.isBreak && (c.subject?.toUpperCase().includes("BREAK") || c.subject?.toUpperCase().includes("LUNCH")));
                            const isRealBreakGroup = realBreaks.length > 0;
                            const isParallel = classes.length > 1;
                            
                            // Check if all classes in group have same status
                            const statuses = classes.map(c => dailyRecords[c.backendId]?.status);
                            const isAllPresent = statuses.every(s => s === "PRESENT");
                            const isAllAbsent = statuses.every(s => s === "ABSENT");
                            const isMixed = !isAllPresent && !isAllAbsent && statuses.some(s => s);
                            const isAnyLoading = classes.some(c => loadingSlots[c.backendId]);

                            return (
                              <div key={groupIdx} className={`flex flex-col xl:flex-row xl:items-center justify-between p-5 rounded-3xl border transition-all gap-6 ${
                                isRealBreakGroup 
                                ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-300/50 dark:border-amber-800/40 italic" 
                                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
                              }`}>
                                <div className="flex flex-col gap-4 flex-1 min-w-0">
                                  {classes.map((classData, idx) => {
                                    const isThisRealBreak = classData.isBreak && (classData.subject?.toUpperCase().includes("BREAK") || classData.subject?.toUpperCase().includes("LUNCH"));
                                    const subjectColor = getSubjectColor(classData.subject, classData.subjectId);
                                    
                                    return (
                                      <div key={classData.backendId || idx} className="flex items-start gap-4">
                                        <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: isThisRealBreak ? '#d97706' : subjectColor }}></div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {isThisRealBreak && <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-tight">Break Slot</span>}
                                            {!isThisRealBreak && classData.isBreak && <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-tight">Special Slot</span>}
                                            <h3 className={`text-lg font-bold dark:text-white truncate ${isThisRealBreak ? 'text-amber-900 dark:text-amber-400 not-italic' : ''}`}>{classData.subject}</h3>
                                            {(classData.subject?.toUpperCase().includes("LAB") || 
                                              classData.subject?.toUpperCase().includes("PRACTICAL") ||
                                              classData.subject?.toUpperCase().endsWith("L") ||
                                              classData.courseCode?.toUpperCase().endsWith("L")) && (
                                              <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-[10px] font-black uppercase tracking-tight">Lab Session</span>
                                            )}
                                          </div>
                                          <p className="text-[13px] text-slate-500 font-bold flex items-center gap-2 mt-1 overflow-hidden">
                                            <Clock size={13} className="flex-shrink-0" /> {slot.start} - {slot.end}
                                            {!classData.isBreak && classData.professor && (
                                              <>
                                                <span className="mx-0.5 opacity-30">•</span>
                                                <span className="truncate">{classData.professor}</span>
                                              </>
                                            )}
                                            {!classData.isBreak && classData.room && (
                                              <>
                                                <span className="mx-0.5 opacity-30">•</span>
                                                <span className="truncate">{classData.room}</span>
                                              </>
                                            )}
                                            {classData.groupInfo && <span className="text-[10px] uppercase text-white px-2 py-0.5 rounded-lg ml-1 font-black shadow-sm" style={{ backgroundColor: subjectColor }}>{classData.groupInfo}</span>}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {!isAnyBreak ? (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl gap-2 w-fit border border-slate-200 dark:border-slate-800 shadow-sm mx-auto xl:mx-0">
                                      <button 
                                        disabled={isAnyLoading}
                                        onClick={() => toggleAttendanceStatus(classes.map(c => c.backendId), "PRESENT")} 
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black transition-all ${isAnyLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isAllPresent ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600"}`}
                                      >
                                        <CheckCircle size={18} /> {isParallel ? "MARK PRESENT" : "PRESENT"}
                                      </button>
                                      <button 
                                        disabled={isAnyLoading}
                                        onClick={() => toggleAttendanceStatus(classes.map(c => c.backendId), "ABSENT")} 
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black transition-all ${isAnyLoading ? 'opacity-50 cursor-not-allowed' : ''} ${isAllAbsent ? "bg-red-500 text-white shadow-md shadow-red-500/20" : "text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"}`}
                                      >
                                        <X size={18} /> {isParallel ? "MARK ABSENT" : "ABSENT"}
                                      </button>
                                    </div>
                                    {isMixed && <p className="text-[10px] font-bold text-amber-500 text-center xl:text-left animate-pulse tracking-wide uppercase">Mixed Status Detected</p>}
                                  </div>
                                ) : (
                                  isRealBreakGroup ? (
                                    <div className="px-6 py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-2xl font-black text-xs uppercase tracking-widest border border-amber-200 dark:border-amber-800/50 text-center">
                                      Enjoy your break!
                                    </div>
                                  ) : (
                                    <div className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-center">
                                      Special Session
                                    </div>
                                  )
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ============ SUBJECT ANALYSIS GRAPH ============ */}
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm mt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center flex-shrink-0">
                      <BarChart2 className="h-5 w-5 text-brand dark:text-brand-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold dark:text-white">Subject Analysis</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Attendance distribution across your subjects</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1.5 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 ml-2">Min. Target:</span>
                    <input type="number" value={minPercentage} onChange={(e) => setMinPercentage(e.target.value)} className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-center text-sm font-semibold py-1 focus:outline-none focus:border-brand dark:text-white dark:[color-scheme:dark]" min="0" max="100"/>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-2">%</span>
                  </div>
                </div>

                {subjectAnalysis.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No subject data available to analyze.</p>
                ) : (
                  <div className="h-64 mt-4 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectAnalysis} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                        <XAxis dataKey="shortName" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(val) => `${val}%`} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const isDanger = data.percentage < (parseFloat(minPercentage) || 0);
                              return (
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                                  <p className="font-bold text-sm mb-1 text-slate-900 dark:text-slate-100">{data.name}</p>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold text-lg ${isDanger ? 'text-red-500' : 'text-emerald-500'}`}>{data.percentage}%</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">({data.present}/{data.total} days)</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine y={parseFloat(minPercentage) || 0} stroke="#ef4444" strokeDasharray="3 3" />
                        <Bar dataKey="percentage" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          {subjectAnalysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.percentage >= (parseFloat(minPercentage) || 0) ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* ============ HOLIDAYS & EXAMS SUMMARY ============ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Upcoming Holidays</h3>
                  {holidays.length === 0 ? (
                     <p className="text-xs font-bold text-slate-400 dark:text-slate-500 py-2">No holidays added.</p>
                  ) : (
                     <div className="space-y-3">
                        {holidays.slice().sort((a,b) => new Date(a.date) - new Date(b.date)).map((h, i) => (
                           <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50">
                              <div>
                                 <p className="font-bold text-amber-800 dark:text-amber-500 text-sm">{h.name}</p>
                                 <p className="text-xs font-bold text-amber-700/70 dark:text-amber-500/70 mt-0.5">{new Date(h.date).toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'})}</p>
                              </div>
                              <button onClick={() => deleteHoliday(h.date)} className="p-2 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl transition"><Trash2 size={16} /></button>
                           </div>
                        ))}
                     </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Upcoming Exams</h3>
                  {exams.length === 0 ? (
                     <p className="text-xs font-bold text-slate-400 dark:text-slate-500 py-2">No exams scheduled.</p>
                  ) : (
                     <div className="space-y-3">
                        {exams.slice().sort((a,b) => new Date(a.date) - new Date(b.date)).map((e, i) => (
                           <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/50">
                              <div>
                                 <p className="font-bold text-purple-700 dark:text-purple-500 text-sm">{e.subject}</p>
                                 <p className="text-xs font-bold text-purple-600/70 dark:text-purple-500/70 mt-0.5">{new Date(e.date).toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'})} &bull; {e.startTime}</p>
                              </div>
                              <button onClick={() => deleteExam(e.date)} className="p-2 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl transition"><Trash2 size={16} /></button>
                           </div>
                        ))}
                     </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-6">
              {/* TIMETABLE SETUP UI REMAINS */}
              <div className="flex justify-end gap-2 flex-wrap">
                <button onClick={() => setShowUploadModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark transition text-sm font-bold shadow-md"><Grid size={16} /> Auto-Extract</button>
                <button onClick={() => setShowSubjectsBar(!showSubjectsBar)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition text-sm font-bold shadow-md"><BookOpen size={16} /> {showSubjectsBar ? 'Hide Subjects' : 'Show Subjects'}</button>
                <button onClick={() => setShowEditTimeSlots(!showEditTimeSlots)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-700 transition text-sm font-bold shadow-md inline-block"><Clock size={16} /> Edit Time Slots</button>
                <button onClick={() => {
                  if (showAddSubject) {
                    setShowAddSubject(false);
                    setEditingSubjectId(null);
                    setNewSubject({ name: "", fullName: "", color: "#6366f1", professor: "", roomNumber: "" });
                  } else {
                    setShowAddSubject(true);
                  }
                }} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition text-sm font-bold shadow-md"><BookOpen size={16} /> Add Subject</button>
                <button onClick={clearSubjects} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-700 text-white hover:bg-orange-800 transition text-sm font-bold shadow-md"><Trash2 size={16} /> Clear Subjects</button>
                <button onClick={clearTimetable} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition text-sm font-bold shadow-md"><Trash2 size={16} /> Clear Timetable</button>
              </div>

              {/* Modals & Grids ... (kept very similar but compact) */}
              <AnimatePresence>{showAddSubject && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand" value={newSubject.name} onChange={e=>setNewSubject({...newSubject,name:e.target.value})} placeholder="Short Name (e.g. OOP)"/>
                      <input className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand" value={newSubject.fullName} onChange={e=>setNewSubject({...newSubject,fullName:e.target.value})} placeholder="Full Form (Optional)"/>
                      <input className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand" value={newSubject.professor} onChange={e=>setNewSubject({...newSubject,professor:e.target.value})} placeholder="Faculty Name"/>
                    </div>
                    <div className="flex gap-4">
                      <input className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand" value={newSubject.roomNumber} onChange={e=>setNewSubject({...newSubject,roomNumber:e.target.value})} placeholder="Default Room (Optional)"/>
                      <input type="color" className="w-[60px] h-[46px] rounded-xl self-center cursor-pointer border-none" value={newSubject.color} onChange={e=>setNewSubject({...newSubject,color:e.target.value})}/>
                      <button onClick={saveSubject} className="bg-purple-600 text-white px-8 font-bold rounded-xl shadow-md transition hover:bg-purple-700 hover:shadow-lg dark:hover:shadow-purple-500/20">{editingSubjectId ? "Save Subject" : "Add Subject"}</button>
                    </div>
                  </div>
                </motion.div>
              )}</AnimatePresence>

              <AnimatePresence>{showEditTimeSlots && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden p-6 mt-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                       {timeSlots.map(ts => (
                          <div key={ts.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border dark:border-slate-700">
                             <span className="text-sm font-bold dark:text-white">{ts.start} - {ts.end}</span>
                             <button onClick={() => removeTimeSlot(ts.id)} className="text-slate-400 hover:text-red-500 transition"><X size={14}/></button>
                          </div>
                       ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input type="time" className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-slate-400 dark:[color-scheme:dark]" value={newTimeSlot.start} onChange={e=>setNewTimeSlot({...newTimeSlot, start: e.target.value})} />
                      <input type="time" className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-slate-400 dark:[color-scheme:dark]" value={newTimeSlot.end} onChange={e=>setNewTimeSlot({...newTimeSlot, end: e.target.value})} />
                      <button onClick={addTimeSlot} className="bg-slate-800 dark:bg-slate-700 text-white px-8 font-bold rounded-xl shadow-md transition hover:bg-slate-900 dark:hover:bg-slate-600">Add Slot</button>
                    </div>
                  </div>
                </motion.div>
              )}</AnimatePresence>

              <AnimatePresence>
                {showSubjectsBar && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: 'auto', opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div 
                       className="flex flex-wrap gap-2 min-h-[40px] p-2 -mx-2 rounded-2xl border-2 border-dashed border-transparent hover:border-red-400 hover:bg-red-50/50 dark:hover:border-red-900/50 dark:hover:bg-red-900/10 transition-colors mt-2 mb-4"
                       onDragOver={(e) => e.preventDefault()}
                       onDrop={(e) => {
                          e.preventDefault();
                          const slotDataStr = e.dataTransfer.getData('deleteSlot');
                          if (slotDataStr) {
                             const { day, start } = JSON.parse(slotDataStr);
                             deleteClass(day, start);
                          }
                       }}
                       title="Drag subjects back here to remove them from the timetable"
                    >
                      {subjects.map(s => (
                        <div 
                           key={s.id} 
                           draggable 
                           onDragStart={(e) => { e.dataTransfer.setData('subjectId', s.id); }}
                           className="flex items-center gap-2 px-4 py-1.5 rounded-full border bg-white dark:bg-slate-900 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition dark:border-slate-800" 
                           style={{borderColor: s.color}}
                        >
                           <Circle size={10} style={{fill: s.color, color: s.color}} />
                            <div className="flex flex-col min-w-0 py-0.5">
                               <span className="text-xs font-black dark:text-white truncate leading-tight">{s.name}</span>
                               {s.professor && <span className="text-[10px] text-slate-500 font-bold truncate leading-tight">{s.professor}</span>}
                               {s.fullName && s.fullName !== s.name && (
                                 <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold -mt-0.5 truncate max-w-[180px] leading-tight">
                                   {s.fullName}
                                 </span>
                               )}
                            </div>
                           <div className="flex items-center gap-1">
                             <button onClick={()=>openEditSubject(s)}><Edit2 size={12} className="opacity-50 hover:opacity-100 dark:text-white hover:text-brand-500 dark:hover:text-brand-400 transition" /></button>
                             <button onClick={()=>deleteSubject(s.id)}><X size={12} className="opacity-50 hover:opacity-100 dark:text-white hover:text-red-500 dark:hover:text-red-500 transition" /></button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>


              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-800">
                        <th className="p-4 text-left font-black text-slate-500 dark:text-slate-400 min-w-[100px] sticky left-0 z-10 bg-slate-50 dark:bg-slate-800">DAY</th>
                        {timeSlots.map(slot => (
                          <th key={slot.id} className="p-3 text-center min-w-[140px] font-bold text-slate-900 dark:text-white border-l dark:border-slate-700/50">
                            <div>{slot.start}</div><div className="text-[10px] text-slate-500">{slot.end}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map(day => {
                        let skipCols = 0;
                        return (
                        <tr key={day} className="border-b dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-4 font-black text-slate-700 dark:text-white sticky left-0 z-10 bg-white dark:bg-slate-900 border-r dark:border-slate-800">{day}</td>
                          {timeSlots.map((slot, index) => {
                            if (skipCols > 0) {
                                skipCols--;
                                return null;
                            }
                            const classDataRaw = timetable[`${day}-${slot.start}`];
                            let span = 1;
                            const representativeClass = Array.isArray(classDataRaw) ? classDataRaw[0] : classDataRaw;

                            if (representativeClass && representativeClass.endTime) {
                                for (let i = index + 1; i < timeSlots.length; i++) {
                                    if (representativeClass.endTime >= timeSlots[i].end) {
                                        span++;
                                    } else {
                                        break;
                                    }
                                }
                                skipCols = span - 1;
                            }
                            
                            const classesToRender = Array.isArray(classDataRaw) ? classDataRaw : (classDataRaw ? [classDataRaw] : []);

                            return (
                              <td key={slot.id} colSpan={span} className={`p-2 border-l dark:border-slate-800 ${span > 1 ? 'relative z-10' : ''}`}>
                                  {classesToRender.length > 0 ? (
                                    <div className={`flex flex-col gap-2 h-full ${classesToRender.length > 1 ? 'min-w-[150px]' : ''}`}>
                                      {classesToRender.map((classData, idx) => {
                                          const subjectColor = classData ? getSubjectColor(classData.subject, classData.subjectId) : '#000000';
                                          return (
                                            <div 
                                                key={classData.backendId || idx}
                                                draggable={!classData.isBreak}
                                                onDragStart={(e) => { 
                                                    if (classData.isBreak) return;
                                                    e.dataTransfer.setData('deleteSlot', JSON.stringify({day, start: slot.start}));
                                                }}
                                                onClick={() => { setSelectedSlot({day, slot}); setNewClass({...classData, subject: classData.subject}); setShowAddClass(true); }} 
                                                className={`relative group flex-1 min-h-[110px] p-3.5 rounded-[20px] transition-all duration-300 border ${
                                                  classData.isBreak 
                                                  ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/40 flex flex-col items-center justify-center text-center italic" 
                                                  : "cursor-grab active:cursor-grabbing hover:shadow-lg hover:-translate-y-1"
                                                }`} 
                                                style={classData.isBreak ? {} : { 
                                                    backgroundColor: `${subjectColor}1A`, // 10% opacity pastel bg
                                                    borderColor: `${subjectColor}40`, // 25% opacity border
                                                    boxShadow: `0 4px 20px -2px ${subjectColor}15`
                                                }}
                                            >
                                              {classData.isBreak ? (
                                                <div className="text-amber-800 dark:text-amber-400 font-bold text-xs flex flex-col items-center gap-1.5">
                                                  <span className="bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full text-[9px] tracking-widest uppercase font-black opacity-80">Break</span>
                                                  <span className="text-sm not-italic">{classData.subject}</span>
                                                </div>
                                              ) : (
                                                <div className="flex flex-col h-full gap-1.5">
                                                  {/* Subject Title */}
                                                  <div className="font-extrabold text-[14px] leading-tight dark:text-white line-clamp-2 drop-shadow-sm" style={{color: subjectColor}}>
                                                      {classData.subject}
                                                  </div>
                                                  
                                                  <div className="flex-1"></div> {/* Spacer */}

                                                  <div className="flex flex-col gap-1 mt-1">
                                                    {/* Professor */}
                                                    {classData.professor && (
                                                      <div className="flex items-center gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300 font-bold truncate max-w-full" title={classData.professor}>
                                                          <User size={12} className="opacity-60 flex-shrink-0" />
                                                          <span className="truncate tracking-tight">{classData.professor}</span>
                                                      </div>
                                                    )}
                                                    
                                                    {/* Room */}
                                                    {classData.room && (
                                                      <div className="flex items-center gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300 font-bold truncate max-w-full">
                                                          <MapPin size={12} className="opacity-60 flex-shrink-0" />
                                                          <span className="truncate tracking-tight">{classData.room}</span>
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* Group Badge */}
                                                  {classData.groupInfo && (
                                                      <div className="absolute top-3 right-3 shadow-sm rounded-md">
                                                          <span className="inline-flex items-center justify-center text-[10px] uppercase px-2 py-0.5 rounded-md font-black tracking-widest text-white shadow-sm" 
                                                                style={{backgroundColor: subjectColor}}>
                                                              {classData.groupInfo}
                                                          </span>
                                                      </div>
                                                  )}
                                                </div>
                                              )}
                                              <button onClick={(e) => { e.stopPropagation(); deleteClass(day, slot.start, classData.backendId); }} className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-all duration-200"><Trash2 size={14}/></button>
                                            </div>
                                          );
                                      })}
                                    </div>
                                  ) : (
                                  <button 
                                      onClick={() => { setSelectedSlot({day, slot}); setNewClass({...newClass, backendId: null}); setShowAddClass(true); }} 
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={async (e) => {
                                        e.preventDefault();
                                        const subId = e.dataTransfer.getData('subjectId');
                                        if (subId) {
                                           const sub = subjects.find(s => String(s.id) === subId);
                                           if (sub) {
                                              const payload = {
                                                dayOfWeek: day, startTime: slot.start, endTime: slot.end,
                                                subjectId: sub.id, subjectName: sub.name, professor: sub.professor || '',
                                                courseCode: sub.courseCode || '', roomNumber: sub.roomNumber || ''
                                              };
                                              const result = await api.addTimetableSlot(payload);
                                              if (result.error) alert(result.error);
                                              else loadBackendData();
                                           }
                                        }
                                      }}
                                      className="w-full min-h-[90px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-brand text-slate-300 dark:text-slate-700 flex flex-col items-center justify-center transition"
                                  >
                                      <Plus size={20} />
                                      <span className="text-[9px] font-bold uppercase mt-1 opacity-50 tracking-wider">Drop Subject</span>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </div>

              <AnimatePresence>
                {showAddClass && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={()=>setShowAddClass(false)}>
                     <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} onClick={e=>e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800">
                        <h2 className="text-2xl font-black mb-8 dark:text-white text-center">Assign Lecture Block</h2>
                        <div className="space-y-4">
                           <select value={newClass.subjectId} onChange={e=>{ const sub = subjects.find(s=>String(s.id)===e.target.value); setNewClass({...newClass, subjectId: e.target.value, subject: sub?.name||'', professor:sub?.professor||'', courseCode:sub?.courseCode||'', room:sub?.roomNumber||''}) }} className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-brand font-bold text-slate-900 dark:text-white appearance-none">
                              <option value="">Select subject mapping...</option>
                              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.professor ? `(${s.professor})` : ''}</option>)}
                           </select>
                           <div className="flex gap-4">
                               <input placeholder="Room Number (Optional)" value={newClass.room || ''} onChange={e=>setNewClass({...newClass, room: e.target.value})} className="w-1/2 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand transition" />
                               <input placeholder="Group/Batch (e.g. G1)" value={newClass.groupInfo || ''} onChange={e=>setNewClass({...newClass, groupInfo: e.target.value})} className="w-1/2 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand transition" />
                           </div>
                        </div>
                        <div className="flex gap-4 mt-8">
                           <button onClick={()=>setShowAddClass(false)} className="flex-1 py-4 font-black text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-2xl transition">Discard</button>
                           <button onClick={saveClass} className="flex-1 py-4 font-black text-white bg-brand hover:bg-brand-dark rounded-2xl shadow-xl shadow-brand/20 transition">Save Block</button>
                        </div>
                     </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Holiday / Exam Global Modals */}
      <AnimatePresence>
        {showAddHoliday && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={()=>setShowAddHoliday(false)}>
            <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} onClick={e=>e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-amber-200 dark:border-amber-900">
              <h2 className="text-2xl font-black mb-6 text-amber-600 dark:text-amber-500 text-center">Declare Holiday</h2>
              <div className="space-y-4">
                <input type="date" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border outline-none font-bold dark:text-white dark:[color-scheme:dark]" value={newHoliday.date} onChange={e=>setNewHoliday({...newHoliday, date: e.target.value})} />
                <input type="text" placeholder="Holiday Name (e.g. Diwali, Christmas)" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border outline-none font-bold dark:text-white" value={newHoliday.name} onChange={e=>setNewHoliday({...newHoliday, name: e.target.value})} />
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={()=>setShowAddHoliday(false)} className="flex-1 py-4 font-black bg-slate-100 dark:bg-slate-800 rounded-2xl dark:text-white">Cancel</button>
                <button onClick={()=>{ if(newHoliday.date && newHoliday.name){ setHolidays([...holidays, {date: new Date(newHoliday.date).toDateString(), name: newHoliday.name}]); setShowAddHoliday(false); setNewHoliday({date:"", name:""})} }} className="flex-1 py-4 font-black bg-amber-500 text-white rounded-2xl shadow-xl shadow-amber-500/20">Save</button>
              </div>
            </motion.div>
          </div>
        )}
        
        {showAddExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={()=>setShowAddExam(false)}>
            <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} onClick={e=>e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-purple-200 dark:border-purple-900">
              <h2 className="text-2xl font-black mb-6 text-purple-600 dark:text-purple-500 text-center">Schedule Exam</h2>
              <div className="space-y-4">
                <input type="date" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border outline-none font-bold dark:text-white dark:[color-scheme:dark]" value={newExam.date} onChange={e=>setNewExam({...newExam, date: e.target.value})} />
                <input type="text" placeholder="Subject Name" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border outline-none font-bold dark:text-white" value={newExam.subject} onChange={e=>setNewExam({...newExam, subject: e.target.value})} />
                <div className="flex gap-4">
                  <input type="time" placeholder="Start" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border outline-none font-bold dark:text-white dark:[color-scheme:dark]" value={newExam.startTime} onChange={e=>setNewExam({...newExam, startTime: e.target.value})} />
                  <input type="time" placeholder="End" className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border outline-none font-bold dark:text-white dark:[color-scheme:dark]" value={newExam.endTime} onChange={e=>setNewExam({...newExam, endTime: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={()=>setShowAddExam(false)} className="flex-1 py-4 font-black bg-slate-100 dark:bg-slate-800 rounded-2xl dark:text-white">Cancel</button>
                <button onClick={()=>{ if(newExam.date && newExam.subject){ setExams([...exams, {date: new Date(newExam.date).toDateString(), subject: newExam.subject, startTime: newExam.startTime, endTime: newExam.endTime}]); setShowAddExam(false); setNewExam({date:"", subject:"", startTime:"", endTime:""})} }} className="flex-1 py-4 font-black bg-purple-600 text-white rounded-2xl shadow-xl shadow-purple-500/20">Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TimetableUploadModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={() => {
          localStorage.removeItem("timetable_timeslots");
          loadBackendData();
        }}
      />
    </div>
  );
}
