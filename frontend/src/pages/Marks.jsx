import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  TrendingUp,
  Calendar,
  BookOpen,
  Plus,
  Calculator,
  ChevronDown,
  Edit2,
  Trash2,
  X,
  Save,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { api } from "../services/api";

// Grade calculation function
const calculateGrade = (totalMarks) => {
  if (totalMarks >= 80) return { grade: "O", points: 10 };
  if (totalMarks >= 70) return { grade: "A+", points: 9 };
  if (totalMarks >= 60) return { grade: "A", points: 8 };
  if (totalMarks >= 55) return { grade: "B+", points: 7 };
  if (totalMarks >= 50) return { grade: "B", points: 6 };
  if (totalMarks >= 45) return { grade: "C", points: 5 };
  if (totalMarks >= 40) return { grade: "P", points: 4 };
  return { grade: "F", points: 0 };
};

const getGradeColor = (grade) => {
  if (!grade || grade === "-") return "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800";
  
  const g = grade.toUpperCase();
  switch (g) {
    case "O":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50";
    case "A+":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50";
    case "A":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50";
    case "B+":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50";
    case "B":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50";
    case "C":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50";
    case "P":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-800/50";
    case "F":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-800/50";
  }
};

// Calculate final marks: 25% mid-sem + 25% internals + 50% end-sem
const calculateFinalMarks = (midSem, internals, endSem) => {
  const midSemContribution = (midSem / 25) * 25;
  const internalsContribution = (internals / 25) * 25;
  const endSemContribution = (endSem / 100) * 50;
  return midSemContribution + internalsContribution + endSemContribution;
};

export default function Marks() {
  const [selectedSemester, setSelectedSemester] = useState(() => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    return parseInt(userData.semester) || 1;
  });
  const [selectedExamType, setSelectedExamType] = useState("All");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timetableCredits, setTimetableCredits] = useState({});
  const [marksSummary, setMarksSummary] = useState(null);
  
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingMark, setEditingMark] = useState(null);

  const [newMark, setNewMark] = useState({
    subjectName: "",
    subjectCode: "",
    credits: "3", // Keep as string for consistent UX
    midSem: "",
    internals: "",
    endSem: ""
  });
  
  const [subjects, setSubjects] = useState([]);
  const [showGlobalSubjectModal, setShowGlobalSubjectModal] = useState(false);
  const [globalSubjectTarget, setGlobalSubjectTarget] = useState({ name: "", courseCode: "", color: "#6366f1" });

  const [hiddenSubjects, setHiddenSubjects] = useState(() => {
    try {
      const data = localStorage.getItem("hiddenMarksSubjects");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const fetchMarks = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    
    const [marksRes, subRes, ttRes] = await Promise.all([
      api.getMarks(selectedSemester),
      api.getSubjects(selectedSemester),
      api.getTimetable()
    ]);
    
    if (marksRes.error) setError(marksRes.error);
    else setMarksSummary(marksRes.data);

    if (subRes.data) setSubjects(subRes.data);

    if (ttRes.data && Array.isArray(ttRes.data)) {
      const counts = {};
      ttRes.data.forEach(slot => {
        if (!slot.isBreak) {
          const key = slot.subjectId ? `id_${slot.subjectId}` : (slot.subjectName ? `name_${slot.subjectName.trim().toLowerCase()}` : null);
          if (key) {
            counts[key] = (counts[key] || 0) + 1;
          }
        }
      });
      setTimetableCredits(counts);
    }

    if (showSpinner) setLoading(false);
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    if (!userData.semester) {
      api.getProfile().then(({ data }) => {
        if (data && data.semester) {
          userData.semester = data.semester;
          localStorage.setItem("userData", JSON.stringify(userData));
          if (selectedSemester === 1) setSelectedSemester(parseInt(data.semester));
        }
      });
    }
    fetchMarks();
  }, [selectedSemester]);

  const handleAddNewGlobalSubject = async () => {
    if (!globalSubjectTarget.name) return alert("Subject Name required");
    const { data, error } = await api.addSubject({ ...globalSubjectTarget, semester: selectedSemester });
    if (error) {
      alert(error);
    } else {
      const parsedData = { ...data, courseCode: data.courseCode || "" };
      setSubjects([...subjects, parsedData]);
      setNewMark({ ...newMark, subjectName: parsedData.name, subjectCode: parsedData.courseCode });
      setShowGlobalSubjectModal(false);
      setGlobalSubjectTarget({ name: "", courseCode: "", color: "#6366f1" });
    }
  };

  const handleDeleteMark = async (id, name) => {
    if (!confirm(`Are you sure you want to delete the marks record for ${name}?`)) return;
    const { error } = await api.deleteMarks(id);
    if (error) {
      alert(error);
    } else {
      fetchMarks(false);
    }
  };

  const handleDeleteSubject = async (tempId, name) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the marks table? (It will not be deleted from the schedule)`)) return;
    const subjectId = tempId.replace("new-", "");
    const newHidden = [...hiddenSubjects, subjectId];
    setHiddenSubjects(newHidden);
    localStorage.setItem("hiddenMarksSubjects", JSON.stringify(newHidden));
  };

  const saveMark = async () => {
    const midSemVal = parseFloat(newMark.midSem) || 0;
    const internalsVal = parseFloat(newMark.internals) || 0;
    const endSemVal = parseFloat(newMark.endSem) || 0;

    const finalScore = calculateFinalMarks(midSemVal, internalsVal, endSemVal);
    const { grade, points } = calculateGrade(finalScore);

    const payload = {
      subjectName: newMark.subjectName,
      subjectCode: newMark.subjectCode,
      semester: selectedSemester,
      credits: parseInt(newMark.credits) || 0,
      midSem: midSemVal,
      internals: internalsVal,
      endSem: endSemVal,
      finalScore,
      grade,
      gradePoints: points
    };

    // Optimistic UI Update
    const prevSummary = { ...marksSummary };
    if (editingMark) {
      setMarksSummary({
        ...marksSummary,
        marks: marksSummary.marks.map(m => m.id === editingMark.id ? { ...payload, id: editingMark.id } : m)
      });
    } else {
      const tempId = Date.now();
      const newMarksArray = [...(marksSummary?.marks || []), { ...payload, id: tempId, isOptimistic: true }];
      setMarksSummary({
        ...(marksSummary || {}),
        marks: newMarksArray
      });
    }

    let apiError;
    if (editingMark) {
      const resp = await api.updateMarks(editingMark.id, payload);
      apiError = resp.error;
    } else {
      const resp = await api.addMarks(payload);
      apiError = resp.error;
    }

    if (apiError) {
      setMarksSummary(prevSummary); // Rollback
      alert(apiError);
      return;
    }

    await fetchMarks(false);
    setNewMark({ subjectName: "", subjectCode: "", credits: "3", midSem: "", internals: "", endSem: "" });
    setEditingMark(null);
    setShowSubjectModal(false);
  };

  const deleteMark = async (id) => {
    if (confirm("Are you sure you want to delete this record?")) {
      const prevSummary = { ...marksSummary };
      setMarksSummary({
        ...marksSummary,
        marks: marksSummary.marks.filter(m => m.id !== id)
      }); // Optimistic UI

      const { error: apiError } = await api.deleteMarks(id);
      if (apiError) {
        setMarksSummary(prevSummary); // Rollback
        alert(apiError);
        return;
      }
      await fetchMarks(false);
    }
  };

  const startEditMark = (mark) => {
    setEditingMark(mark);
    setNewMark({
      subjectName: mark.subjectName,
      subjectCode: mark.subjectCode || "",
      credits: (mark.credits || 3).toString(),
      midSem: (mark.midSem || "").toString(),
      internals: (mark.internals || "").toString(),
      endSem: (mark.endSem || "").toString(),
    });
    setShowSubjectModal(true);
  };

  const cgpa = marksSummary?.cgpa || 0;
  const currentSgpa = marksSummary?.currentSgpa || 0;
  
  const mergedMarks = useMemo(() => {
    const existingMarks = marksSummary?.marks || [];
    const result = existingMarks.map(m => {
      const matchedSub = Array.isArray(subjects) ? subjects.find(s => (s.name || "").trim().toLowerCase() === (m.subjectName || "").trim().toLowerCase()) : null;
      let ttCount = 0;
      if (matchedSub) {
         ttCount = timetableCredits[`id_${matchedSub.id}`] || timetableCredits[`name_${(matchedSub.name || "").trim().toLowerCase()}`];
      } else {
         ttCount = timetableCredits[`name_${(m.subjectName || "").trim().toLowerCase()}`];
      }
      return {
        ...m,
        credits: ttCount || m.credits || 3
      };
    });
    
    // Add missing subjects from the semester-specific subjects list
    if (Array.isArray(subjects)) {
      subjects.forEach(sub => {
        if (!sub.name) return;
        const hasMark = existingMarks.some(m => 
          (m.subjectName || "").trim().toLowerCase() === sub.name.trim().toLowerCase()
        );
        if (!hasMark && !hiddenSubjects.includes(sub.id.toString())) {
          const ttCount = timetableCredits[`id_${sub.id}`] || timetableCredits[`name_${sub.name.trim().toLowerCase()}`];
          result.push({
            id: `new-${sub.id}`,
            subjectName: sub.name,
            subjectCode: sub.courseCode || "",
            credits: ttCount || 3, 
            midSem: null,
            internals: null,
            endSem: null,
            finalScore: 0,
            grade: "-",
            gradePoints: 0,
            isNew: true
          });
        }
      });
    }
    
    return result.sort((a, b) => (a.subjectName || "").localeCompare(b.subjectName || ""));
  }, [marksSummary, subjects, timetableCredits]);

  const marks = mergedMarks;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Performance"
        description="Track marks, calculate grades, and monitor SGPA/CGPA."
        actions={
          <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingMark(null);
                    setNewMark({ subjectName: "", subjectCode: "", credits: "3", midSem: "", internals: "", endSem: "" });
                    setShowSubjectModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:bg-emerald-700 transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Add Subject Marks
                </button>
          </div>
        }
      />

      {loading && <LoadingSpinner message="Loading marks..." />}
      {error && <ErrorMessage message={error} onRetry={fetchMarks} />}

      {!loading && !error && (
        <>
          {/* SGPA/CGPA Summary */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark dark:bg-none dark:bg-white p-6 shadow-lg text-white dark:text-slate-900 border border-transparent dark:border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white/20 dark:bg-brand/10 flex items-center justify-center text-white dark:text-brand">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-white/80 dark:text-slate-500 font-medium">Overall CGPA</p>
                  <p className="text-3xl font-bold">{(cgpa || 0).toFixed(2)}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-gradient-to-br from-teal-600 to-blue-700 p-6 shadow-lg text-white"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-white/80 font-medium">Current SGPA</p>
                  <p className="text-3xl font-bold">{(currentSgpa || 0).toFixed(2)}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-accent/10 text-accent dark:text-accent-light flex items-center justify-center">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Subjects</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {subjects.length}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Semester</p>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                    className="mt-1 bg-transparent border-none text-xl font-bold text-slate-900 dark:text-slate-100 focus:ring-0 p-0 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem} className="text-base text-slate-900 dark:text-slate-100">
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 sm:mb-0">
                Detailed Marks
              </h3>
              <div className="flex flex-wrap gap-2">
                {["All", "Mid-Sem", "Internals", "End-Sem"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedExamType(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedExamType === type
                        ? "bg-brand text-white shadow-md shadow-brand/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-4 font-bold text-sm">Subject</th>
                    <th className="px-6 py-4 font-bold text-sm text-center">Credits</th>
                    {(selectedExamType === "All" || selectedExamType === "Mid-Sem") && (
                      <th className="px-6 py-4 font-bold text-sm text-center">Mid Sem (25)</th>
                    )}
                    {(selectedExamType === "All" || selectedExamType === "Internals") && (
                      <th className="px-6 py-4 font-bold text-sm text-center">Internals (25)</th>
                    )}
                    {(selectedExamType === "All" || selectedExamType === "End-Sem") && (
                      <th className="px-6 py-4 font-bold text-sm text-center">End Sem (50)</th>
                    )}
                    <th className="px-6 py-4 font-bold text-sm text-center">Total (100)</th>
                    <th className="px-6 py-4 font-bold text-sm text-center">Grade</th>
                    <th className="px-6 py-4 font-bold text-sm text-center">Points</th>
                    <th className="px-6 py-4 font-bold text-sm text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {marks.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-4">
                          <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                          <p>No marks recorded for this semester.</p>
                          <button
                            onClick={() => {
                              setEditingMark(null);
                              setNewMark({ subjectName: "", subjectCode: "", credits: "3", midSem: "", internals: "", endSem: "" });
                              setShowSubjectModal(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand/10 text-brand px-4 py-2 text-sm font-semibold hover:bg-brand/20 transition-all"
                          >
                            <Plus size={16} />
                            Add Your First Marks
                          </button>
                        </div>
                       </td>
                    </tr>
                  ) : (
                    marks.map((mark) => (
                      <tr key={mark.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-base">
                              {mark.subjectName}
                            </div>
                            {mark.subjectCode && <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{mark.subjectCode}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-center text-slate-700 dark:text-slate-300">{mark.credits}</td>
                        {(selectedExamType === "All" || selectedExamType === "Mid-Sem") && (
                          <td className="px-6 py-4 font-medium text-center text-slate-700 dark:text-slate-300">{mark.midSem ?? "-"}</td>
                        )}
                        {(selectedExamType === "All" || selectedExamType === "Internals") && (
                          <td className="px-6 py-4 font-medium text-center text-slate-700 dark:text-slate-300">{mark.internals ?? "-"}</td>
                        )}
                        {(selectedExamType === "All" || selectedExamType === "End-Sem") && (
                          <td className="px-6 py-4 font-medium text-center text-slate-700 dark:text-slate-300">{mark.endSem ?? "-"}</td>
                        )}
                        <td className="px-6 py-4 font-black text-center text-brand dark:text-white text-base">{mark.isNew ? "-" : parseFloat(mark.finalScore || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center rounded-lg px-3 py-1 text-sm font-black shadow-sm border ${getGradeColor(mark.grade)}`}>
                            {mark.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-center text-slate-700 dark:text-slate-300">{mark.isNew ? "-" : mark.gradePoints}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => {
                                if (mark.isNew) {
                                  setEditingMark(null);
                                  setNewMark({ 
                                    subjectName: mark.subjectName || "", 
                                    subjectCode: mark.subjectCode || "", 
                                    credits: (mark.credits || 3).toString(), 
                                    midSem: "", 
                                    internals: "", 
                                    endSem: "" 
                                  });
                                  setShowSubjectModal(true);
                                } else {
                                  startEditMark(mark);
                                }
                              }} 
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                              title={mark.isNew ? "Enter Marks" : "Edit Marks"}
                            >
                              {mark.isNew ? <Plus className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                            </button>
                            <button onClick={() => mark.isNew ? handleDeleteSubject(mark.id, mark.subjectName) : handleDeleteMark(mark.id, mark.subjectName)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      {/* Add/Edit Mark Modal */}
      <AnimatePresence>
        {showSubjectModal && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setShowSubjectModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {editingMark ? "Edit Marks" : "Add Marks"}
                </h3>
                <button
                  onClick={() => setShowSubjectModal(false)}
                  className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject Name *</label>
                  {!editingMark ? (
                    <div className="flex gap-2">
                       <select
                         value={newMark.subjectName}
                         onChange={(e) => {
                           if (e.target.value === "__add_new__") {
                             setShowGlobalSubjectModal(true);
                           } else {
                             const found = subjects.find(s => s.name === e.target.value);
                             setNewMark({ ...newMark, subjectName: e.target.value, subjectCode: found ? (found.courseCode || "") : newMark.subjectCode });
                           }
                         }}
                         className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all dark:text-white hover:cursor-pointer"
                       >
                         <option value="" disabled>Select a Subject</option>
                         {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                         <option value="__add_new__" className="font-bold text-brand">+ Add New Subject</option>
                       </select>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={newMark.subjectName}
                      disabled
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm outline-none text-slate-500 dark:text-slate-400"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject Code</label>
                    <input
                      type="text"
                      value={newMark.subjectCode}
                      onChange={(e) => setNewMark({ ...newMark, subjectCode: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all dark:text-white"
                      placeholder="e.g. CS301"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Credits</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={newMark.credits}
                      onChange={(e) => setNewMark({ ...newMark, credits: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mid-Sem</label>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={newMark.midSem}
                      onChange={(e) => setNewMark({ ...newMark, midSem: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Internals</label>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={newMark.internals}
                      onChange={(e) => setNewMark({ ...newMark, internals: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End-Sem</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newMark.endSem}
                      onChange={(e) => setNewMark({ ...newMark, endSem: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                <button
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMark}
                  className="px-4 py-2 bg-brand text-white font-medium rounded-xl hover:bg-brand-dark transition-colors shadow-lg shadow-brand/20 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Add Subject Modal */}
      <AnimatePresence>
        {showGlobalSubjectModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowGlobalSubjectModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-bold dark:text-white">New Subject</h3>
                <button onClick={() => setShowGlobalSubjectModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">SUBJECT NAME</label>
                  <input type="text" value={globalSubjectTarget.name} onChange={(e) => setGlobalSubjectTarget({...globalSubjectTarget, name: e.target.value})} className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand outline-none" placeholder="e.g. Database Systems" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">COURSE CODE</label>
                  <input type="text" value={globalSubjectTarget.courseCode} onChange={(e) => setGlobalSubjectTarget({...globalSubjectTarget, courseCode: e.target.value})} className="w-full bg-slate-100 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand outline-none" placeholder="e.g. CS401" />
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button onClick={() => setShowGlobalSubjectModal(false)} className="px-4 py-2 font-bold text-sm text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl">Cancel</button>
                <button onClick={handleAddNewGlobalSubject} className="px-4 py-2 bg-brand text-white font-bold text-sm rounded-xl">Create</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
