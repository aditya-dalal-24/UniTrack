import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Edit2,
  Trash2,
  Clock,
  User,
  BookOpen,
  Save,
  Calendar,
} from "lucide-react";
import { api } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

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

export default function Timetable() {
  const [subjects, setSubjects] = useState([]);
  const [timeSlots, setTimeSlots] = useState(defaultTimeSlots);
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load timetable and subjects from backend
  const fetchAll = async () => {
    setLoading(true);
    setError(null);

    // Fetch subjects
    const { data: subData } = await api.getSubjects();
    if (subData) {
      const colors = ["#6366f1", "#f472b6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
      setSubjects((subData || []).map((s, i) => ({
        id: s.id,
        name: s.name,
        color: colors[i % colors.length],
        courseCode: s.courseCode,
        professor: s.professor,
      })));
    }

    // Fetch timetable slots
    const { data: slotData, error: slotError } = await api.getTimetable();
    if (slotError) {
      setError(slotError);
    } else if (slotData) {
      const timetableObj = {};
      slotData.forEach(slot => {
        // Match slot to time slot id by start time
        const matchingSlot = defaultTimeSlots.find(ts => ts.start === slot.startTime);
        const slotId = matchingSlot?.id || slot.startTime;
        const key = `${slot.dayOfWeek}-${slotId}`;
        timetableObj[key] = {
          backendId: slot.id,
          subject: slot.subjectName,
          professor: slot.professor,
          courseCode: slot.courseCode,
          room: slot.roomNumber,
        };
      });
      setTimetable(timetableObj);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showEditTimeSlots, setShowEditTimeSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [newSubject, setNewSubject] = useState({ name: "", color: "#6366f1" });
  const [newClass, setNewClass] = useState({
    subject: "",
    professor: "",
    courseCode: "",
    courseName: "",
    room: "",
  });

  const [newTimeSlot, setNewTimeSlot] = useState({ start: "", end: "" });

  const addSubject = () => {
    if (!newSubject.name) {
      alert("Please enter subject name");
      return;
    }
    setSubjects([...subjects, { id: Date.now(), ...newSubject }]);
    setNewSubject({ name: "", color: "#6366f1" });
    setShowAddSubject(false);
  };

  const deleteSubject = (id) => {
    // Find the subject name BEFORE removing it from the array
    const subjectToDelete = subjects.find((s) => s.id === id);
    const subjectName = subjectToDelete?.name;
    
    // Remove the subject
    setSubjects(subjects.filter((s) => s.id !== id));
    
    // Remove classes with this subject
    if (subjectName) {
      const newTimetable = { ...timetable };
      Object.keys(newTimetable).forEach((key) => {
        if (newTimetable[key].subject === subjectName) {
          delete newTimetable[key];
        }
      });
      setTimetable(newTimetable);
    }
  };

  const openAddClass = (day, slotId) => {
    setSelectedSlot({ day, slotId });
    const existing = timetable[`${day}-${slotId}`];
    if (existing) {
      setNewClass(existing);
    } else {
      setNewClass({
        subject: "",
        professor: "",
        courseCode: "",
        courseName: "",
        room: "",
      });
    }
    setShowAddClass(true);
  };

  const saveClass = () => {
    if (!newClass.subject || !newClass.professor || !newClass.courseCode) {
      alert("Please fill in required fields (Subject, Professor, Course Code)");
      return;
    }

    const key = `${selectedSlot.day}-${selectedSlot.slotId}`;
    setTimetable({ ...timetable, [key]: { ...newClass } });
    setShowAddClass(false);
    setNewClass({
      subject: "",
      professor: "",
      courseCode: "",
      courseName: "",
      room: "",
    });
  };

  const deleteClass = (day, slotId) => {
    const newTimetable = { ...timetable };
    delete newTimetable[`${day}-${slotId}`];
    setTimetable(newTimetable);
  };

  const addTimeSlot = () => {
    if (!newTimeSlot.start || !newTimeSlot.end) {
      alert("Please enter start and end time");
      return;
    }
    setTimeSlots([...timeSlots, { id: Date.now(), ...newTimeSlot }]);
    setNewTimeSlot({ start: "", end: "" });
  };

  const deleteTimeSlot = (id) => {
    setTimeSlots(timeSlots.filter((s) => s.id !== id));
    // Remove classes in this slot
    const newTimetable = { ...timetable };
    Object.keys(newTimetable).forEach((key) => {
      if (key.endsWith(`-${id}`)) {
        delete newTimetable[key];
      }
    });
    setTimetable(newTimetable);
  };

  const getSubjectColor = (subjectName) => {
    return subjects.find((s) => s.name === subjectName)?.color || "#6366f1";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Timetable</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your weekly class schedule
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEditTimeSlots(!showEditTimeSlots)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-600 text-white hover:bg-slate-700 transition-all text-sm font-semibold shadow-lg active:scale-95"
          >
            <Clock className="h-4 w-4" />
            {showEditTimeSlots ? "Close" : "Edit Time Slots"}
          </button>
          <button
            onClick={() => setShowAddSubject(!showAddSubject)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all text-sm font-semibold shadow-lg active:scale-95"
          >
            <BookOpen className="h-4 w-4" />
            {showAddSubject ? "Cancel" : "Add Subject"}
          </button>
        </div>
      </div>

      {/* Add Subject Form */}
      <AnimatePresence>
        {showAddSubject && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-500/5 to-purple-600/5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Add New Subject
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    placeholder="e.g., Data Structures"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newSubject.color}
                    onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                </div>
              </div>
              <button
                onClick={addSubject}
                className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all text-sm font-medium"
              >
                Add Subject
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Time Slots */}
      <AnimatePresence>
        {showEditTimeSlots && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-500/5 to-slate-600/5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Manage Time Slots
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newTimeSlot.start}
                    onChange={(e) => setNewTimeSlot({ ...newTimeSlot, start: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newTimeSlot.end}
                    onChange={(e) => setNewTimeSlot({ ...newTimeSlot, end: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={addTimeSlot}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-600 text-white hover:bg-slate-700 transition-all text-sm font-medium"
                  >
                    Add Slot
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                  >
                    <span className="font-medium">
                      {slot.start} - {slot.end}
                    </span>
                    <button
                      onClick={() => deleteTimeSlot(slot.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subjects List */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6">
        <h3 className="text-lg font-bold mb-4">Subjects</h3>
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border group"
              style={{
                backgroundColor: `${subject.color}20`,
                borderColor: subject.color,
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: subject.color }}
              />
              <span className="text-sm font-medium" style={{ color: subject.color }}>
                {subject.name}
              </span>
              <button
                onClick={() => deleteSubject(subject.id)}
                className="hover:scale-110 transition-transform"
                title="Delete subject"
              >
                <X size={14} style={{ color: subject.color }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[100px] sticky left-0 bg-slate-50 dark:bg-slate-800/50 z-10">
                  Day
                </th>
                {timeSlots.map((slot) => (
                  <th
                    key={slot.id}
                    className="px-3 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[140px]"
                  >
                    <div>{slot.start}</div>
                    <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">{slot.end}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr
                  key={day}
                  className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-900 z-10">
                    {day}
                  </td>
                  {timeSlots.map((slot) => {
                    const classData = timetable[`${day}-${slot.id}`];
                    return (
                      <td key={slot.id} className="px-2 py-2">
                        {classData ? (
                          <div
                            className="p-3 rounded-lg cursor-pointer group relative"
                            style={{
                              backgroundColor: `${getSubjectColor(classData.subject)}20`,
                              borderLeft: `3px solid ${getSubjectColor(classData.subject)}`,
                            }}
                            onClick={() => openAddClass(day, slot.id)}
                          >
                            <div className="text-xs font-bold mb-1" style={{ color: getSubjectColor(classData.subject) }}>
                              {classData.courseCode}
                            </div>
                            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {classData.subject}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {classData.professor}
                            </div>
                            {classData.room && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Room: {classData.room}
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteClass(day, slot.id);
                              }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openAddClass(day, slot.id)}
                            className="w-full h-full min-h-[80px] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand hover:bg-brand/5 transition-all flex items-center justify-center group"
                          >
                            <Plus className="h-5 w-5 text-slate-400 group-hover:text-brand transition-colors" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Class Modal */}
      <AnimatePresence>
        {showAddClass && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddClass(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl border shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-semibold mb-4">Add/Edit Class</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Subject *
                    </label>
                    <select
                      value={newClass.subject}
                      onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.name}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Course Code *
                    </label>
                    <input
                      type="text"
                      value={newClass.courseCode}
                      onChange={(e) => setNewClass({ ...newClass, courseCode: e.target.value })}
                      placeholder="e.g., CS301"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Course Name
                    </label>
                    <input
                      type="text"
                      value={newClass.courseName}
                      onChange={(e) => setNewClass({ ...newClass, courseName: e.target.value })}
                      placeholder="e.g., Advanced Data Structures"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Professor Name *
                    </label>
                    <input
                      type="text"
                      value={newClass.professor}
                      onChange={(e) => setNewClass({ ...newClass, professor: e.target.value })}
                      placeholder="e.g., Dr. Smith"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Room Number
                    </label>
                    <input
                      type="text"
                      value={newClass.room}
                      onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                      placeholder="e.g., A-101"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddClass(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveClass}
                  className="px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark transition-all"
                >
                  Save Class
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
