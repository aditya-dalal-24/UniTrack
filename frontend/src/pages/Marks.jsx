import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  TrendingUp,
  Calendar,
  BookOpen,
  Plus,
  Trash2,
  X,
  Save,
  GraduationCap,
  Target,
  Layers,
  Check,
  Search,
  Filter,
  MoreVertical,
  Settings,
  AlertCircle,
  Zap,
  ChevronDown,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

import { api } from "../services/api";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../contexts/AuthContext";
import { recordAction, getSmartDefaults, getMarksSuggestions } from "../utils/behaviorEngine";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

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
  if (!grade || grade === "-") return "text-slate-400";
  const g = grade.toUpperCase();
  switch (g) {
    case "O": return "text-purple-500";
    case "A+": return "text-emerald-500";
    case "A": return "text-green-500";
    case "B+": return "text-blue-500";
    case "B": return "text-amber-500";
    case "C": return "text-orange-500";
    case "P": return "text-slate-500";
    case "F": return "text-red-500";
    default: return "text-slate-500";
  }
};

const calculateFinalMarks = (midSem, internals, endSem, examConfig) => {
  const config = examConfig || {
    mid: { max: 25, weight: 25 },
    int: { max: 25, weight: 25 },
    end: { max: 100, weight: 50 }
  };
  const midSemContribution = config.mid.max > 0 ? (midSem / config.mid.max) * config.mid.weight : 0;
  const internalsContribution = config.int.max > 0 ? (internals / config.int.max) * config.int.weight : 0;
  const endSemContribution = config.end.max > 0 ? (endSem / config.end.max) * config.end.weight : 0;
  return midSemContribution + internalsContribution + endSemContribution;
};

const LedgerRow = ({ mark, onUpdate, onDelete, examConfig }) => {
  const [localMarks, setLocalMarks] = useState({
    subjectName: mark.subjectName ?? "",
    credits: mark.credits ?? "",
    midSem: mark.midSem ?? "",
    internals: mark.internals ?? "",
    endSem: mark.endSem ?? ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalMarks({
      subjectName: mark.subjectName ?? "",
      credits: mark.credits ?? "",
      midSem: mark.midSem ?? "",
      internals: mark.internals ?? "",
      endSem: mark.endSem ?? ""
    });
    setHasChanges(false);
  }, [mark]);

  const handleInputChange = (field, value) => {
    setLocalMarks(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleQuickSave = async () => {
    setIsSaving(true);
    const midSemVal = parseFloat(localMarks.midSem) || 0;
    const internalsVal = parseFloat(localMarks.internals) || 0;
    const endSemVal = parseFloat(localMarks.endSem) || 0;
    const creditsVal = parseInt(localMarks.credits) || 0;
    const finalScore = calculateFinalMarks(midSemVal, internalsVal, endSemVal, examConfig);
    const { grade, points } = calculateGrade(finalScore);

    const payload = {
      subjectName: localMarks.subjectName,
      subjectCode: mark.subjectCode,
      semester: mark.semester,
      credits: creditsVal,
      midSem: midSemVal,
      internals: internalsVal,
      endSem: endSemVal,
      finalScore,
      grade,
      gradePoints: points
    };

    await onUpdate(mark.id, payload, mark.isNew);
    recordAction("marks", "save_marks", { subject: localMarks.subjectName, semester: mark.semester });
    setIsSaving(false);
    setHasChanges(false);
  };

  const aggregateScore = calculateFinalMarks(
    parseFloat(localMarks.midSem) || 0,
    parseFloat(localMarks.internals) || 0,
    parseFloat(localMarks.endSem) || 0,
    examConfig
  );
  const { grade: localGrade } = calculateGrade(aggregateScore);

  return (
    <motion.tr 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all"
    >
      <td className="py-5 px-4 text-center">
        <div className="flex flex-col items-center justify-center">
            <input 
              type="text"
              value={localMarks.subjectName}
              onChange={(e) => handleInputChange("subjectName", e.target.value)}
              className="w-32 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-black text-center text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all shadow-sm"
              placeholder="Subject Name"
            />
            <p className="text-[10px] font-bold text-slate-400 truncate max-w-[150px] mt-1">{mark.subjectFullName || "General Node"}</p>
        </div>
      </td>
      
      <td className="py-5 px-4 text-center">
        <div className="flex justify-center">
            <input 
              type="number"
              value={localMarks.credits}
              onChange={(e) => handleInputChange("credits", e.target.value)}
              className="w-16 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-black text-center text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all shadow-sm text-pink-600 dark:text-pink-400"
              placeholder="Cr"
            />
        </div>
      </td>

      {/* INLINE INPUTS */}
      {["midSem", "internals", "endSem"].map((field) => (
        <td key={field} className="py-5 px-4 text-center">
          <div className="flex justify-center">
            <input 
              type="number"
              value={localMarks[field]}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className="w-16 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-lg py-1.5 px-2 text-xs font-black text-center text-slate-900 dark:text-white focus:border-indigo-500 outline-none transition-all shadow-sm"
              placeholder="-"
            />
          </div>
        </td>
      ))}

      <td className="py-5 px-4 text-center">
        <div className="flex flex-col items-center">
          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
            {mark.isNew && !hasChanges ? "-" : aggregateScore.toFixed(1)}
          </span>
        </div>
      </td>

      <td className="py-5 px-4 text-center">
        <div className="flex justify-center">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-base border-2 border-slate-100 dark:border-slate-800 ${getGradeColor(mark.isNew && !hasChanges ? "-" : localGrade)}`}>
            {mark.isNew && !hasChanges ? "-" : localGrade}
            </div>
        </div>
      </td>

      <td className="py-5 px-4 text-center">
        <div className="flex items-center justify-center gap-2">
          {hasChanges ? (
            <button
              onClick={handleQuickSave}
              disabled={isSaving}
              className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              {isSaving ? <LoadingSpinner size="xs" /> : <><Save size={14} /> Commit</>}
            </button>
          ) : (
            <button
                onClick={() => onDelete(mark.id, mark.subjectName)}
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all border border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100"
            >
                <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  );
};

export default function Marks() {
  const { invalidateDashboard } = useData();
  const [selectedSemester, setSelectedSemester] = useState(() => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    return parseInt(userData.semester) || 1;
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timetableCredits, setTimetableCredits] = useState({});
  const [marksSummary, setMarksSummary] = useState(null);
  
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingMark, setEditingMark] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isInsightsOpen, setIsInsightsOpen] = useState(true);
  
  const [examConfig, setExamConfig] = useState(() => {
    try {
      const data = localStorage.getItem("examStructureConfig");
      if (data) return JSON.parse(data);
    } catch (e) {}
    return {
      mid: { max: 25, weight: 25 },
      int: { max: 25, weight: 25 },
      end: { max: 100, weight: 50 }
    };
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempConfig, setTempConfig] = useState(examConfig);

  const [newMark, setNewMark] = useState({
    subjectName: "",
    subjectCode: "",
    credits: "3",
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
    const loadData = async () => {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      if (!userData.semester) {
        const { data } = await api.getProfile();
        if (data && data.semester) {
          userData.semester = data.semester;
          localStorage.setItem("userData", JSON.stringify(userData));
          const profileSemester = parseInt(data.semester);
          if (selectedSemester !== profileSemester) {
            setSelectedSemester(profileSemester);
            return; // useEffect will re-run with the correct semester
          }
        }
      }
      fetchMarks();
    };
    loadData();
  }, [selectedSemester]);

  const handleUpdateInline = async (id, payload, isNew) => {
    const { error: apiError } = isNew 
      ? await api.addMarks(payload)
      : await api.updateMarks(id, payload);

    if (apiError) {
      alert(apiError);
      return;
    }
    await fetchMarks(false);
    invalidateDashboard();
  };

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

  const saveMark = async () => {
    const midSemVal = parseFloat(newMark.midSem) || 0;
    const internalsVal = parseFloat(newMark.internals) || 0;
    const endSemVal = parseFloat(newMark.endSem) || 0;
    const finalScore = calculateFinalMarks(midSemVal, internalsVal, endSemVal, examConfig);
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

    const { error: apiError } = editingMark 
      ? await api.updateMarks(editingMark.id, payload)
      : await api.addMarks(payload);

    if (apiError) {
      alert(apiError);
      return;
    }

    await fetchMarks(false);
    invalidateDashboard();
    setNewMark({ subjectName: "", subjectCode: "", credits: "3", midSem: "", internals: "", endSem: "" });
    setEditingMark(null);
    setShowSubjectModal(false);
  };

  const deleteMark = async (id, name) => {
    if (!confirm(`Delete marks record for ${name}?`)) return;
    const { error: apiError } = await api.deleteMarks(id);
    if (apiError) {
      alert(apiError);
      return;
    }
    await fetchMarks(false);
    invalidateDashboard();
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
        subjectFullName: matchedSub?.fullName || "",
        credits: ttCount || m.credits || 3,
        semester: selectedSemester
      };
    });
    
    if (Array.isArray(subjects)) {
      subjects.forEach(sub => {
        if (!sub.name) return;
        const hasMark = existingMarks.some(m => (m.subjectName || "").trim().toLowerCase() === sub.name.trim().toLowerCase());
        if (!hasMark && !hiddenSubjects.includes(sub.id.toString())) {
          const ttCount = timetableCredits[`id_${sub.id}`] || timetableCredits[`name_${sub.name.trim().toLowerCase()}`];
          result.push({
            id: `new-${sub.id}`,
            subjectName: sub.name,
            subjectFullName: sub.fullName || "",
            subjectCode: sub.courseCode || "",
            credits: ttCount || 3, 
            midSem: null, internals: null, endSem: null, finalScore: 0, grade: "-", gradePoints: 0, isNew: true,
            semester: selectedSemester
          });
        }
      });
    }
    return result.sort((a, b) => (a.subjectName || "").localeCompare(b.subjectName || ""));
  }, [marksSummary, subjects, timetableCredits, selectedSemester]);

  const filteredMarks = mergedMarks.filter(m => (m.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) || m.subjectCode.toLowerCase().includes(searchQuery.toLowerCase())));

  const gradeDistribution = useMemo(() => {
    const counts = { "O": 0, "A+": 0, "A": 0, "B+": 0, "B": 0, "C": 0, "P": 0, "F": 0 };
    filteredMarks.forEach(m => {
      const g = (m.grade || "").toUpperCase();
      if (counts[g] !== undefined && !m.isNew) counts[g]++;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      count: counts[key],
      color: getGradeColor(key).replace('text-', 'bg-').split('-')[1] // rough mapping, will use hardcoded colors in chart
    }));
  }, [filteredMarks]);

  const { isDark } = useAuth();



  // "What-If" Predictive Intelligence
  const predictiveInsights = useMemo(() => {
     const insights = [];
     const config = examConfig || { mid: { max: 25, weight: 25 }, int: { max: 25, weight: 25 }, end: { max: 100, weight: 50 } };
     
     mergedMarks.forEach(s => {
       // Only skip if End Sem is explicitly filled out with a valid number/score
       // (If the user hasn't added marks yet, s.endSem is null/empty string)
       if (s.endSem !== null && s.endSem !== undefined && s.endSem !== "" && !s.isNew) return;
       
       const midScore = parseFloat(s.midSem) || 0;
       const intScore = parseFloat(s.internals) || 0;
       
       const midContribution = config.mid.max > 0 ? (midScore / config.mid.max) * config.mid.weight : 0;
       const intContribution = config.int.max > 0 ? (intScore / config.int.max) * config.int.weight : 0;
       const currentTotal = midContribution + intContribution;
       
       // Check if they have logged ANY internals
       const hasLoggedInternals = (s.midSem !== null && s.midSem !== "") || (s.internals !== null && s.internals !== "");
       
       // Calculate required marks for next grades
       const targetGrades = [
         { g: 'O', min: 80 },
         { g: 'A+', min: 70 },
         { g: 'A', min: 60 },
         { g: 'B+', min: 55 },
         { g: 'B', min: 50 },
         { g: 'C', min: 45 },
         { g: 'P', min: 40 }
       ];
       
       const getArticle = (grade) => ['O', 'A+', 'A', 'F'].includes(grade) ? 'an' : 'a';
       
       let targetStr = "";
       let isAtRisk = false;
       
       for (const target of targetGrades) {
          const pointsNeeded = target.min - currentTotal;
          if (pointsNeeded <= 0) {
            targetStr = `Already secured ${getArticle(target.g)} '${target.g}' in ${s.subjectName}.`;
            break;
          }
          if (config.end.weight === 0) continue;
          
          const endSemMarksNeeded = (pointsNeeded / config.end.weight) * config.end.max;
          if (endSemMarksNeeded <= config.end.max) {
             targetStr = `Need ${Math.ceil(endSemMarksNeeded)}/${config.end.max} in End-Sem to secure ${getArticle(target.g)} '${target.g}' in ${s.subjectName}.`;
             break;
          }
       }
       
       if (!targetStr) {
         // Mathematically cannot pass
         targetStr = `Mathematically unable to pass P grade (40%) in ${s.subjectName}.`;
         isAtRisk = true;
       } else if (hasLoggedInternals && currentTotal < (config.mid.weight + config.int.weight) * 0.4) {
         isAtRisk = true;
       }
       
       insights.push({ subject: s.subjectName || s.subjectFullName || "Subject", text: targetStr, isAtRisk });
     });
     
     return insights;
  }, [mergedMarks, examConfig]);

  return (
    <div className="space-y-8 pb-12 font-sans">
      <PageHeader
        title="Academic Performance"
        description="Monitor your grades and trajectory with high-precision ledger cards."
        actions={
          <button
            onClick={() => {
              setEditingMark(null);
              const defaults = getSmartDefaults("marks", "add_subject");
              setNewMark({ subjectName: "", subjectCode: "", credits: defaults.credits || "3", midSem: "", internals: "", endSem: "" });
              setShowSubjectModal(true);
            }}
            className="group relative inline-flex items-center gap-2 rounded-2xl bg-brand text-white px-6 py-3 text-sm font-black shadow-xl shadow-brand/20 transition-all hover:scale-105 active:scale-95 overflow-hidden"
          >
            <Plus className="h-5 w-5" />
            <span>Add Subject Marks</span>
          </button>
        }
      />

      {loading && <LoadingSpinner message="Decrypting Academic Node..." />}
      {error && <ErrorMessage message={error} onRetry={fetchMarks} />}

      {!loading && !error && (
        <div className="space-y-10">
          
          {/* Summary Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Overall CGPA", value: cgpa.toFixed(2), icon: Award, color: "blue" },
              { label: "Current SGPA", value: currentSgpa.toFixed(2), icon: TrendingUp, color: "emerald" },
              { label: "Total Subjects", value: subjects.length, icon: Layers, color: "orange" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800 transition-all hover:shadow-2xl"
              >
                <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20 group-hover:opacity-30 transition-all group-hover:scale-150
                  ${stat.color === 'blue' ? 'bg-blue-500' : ''}
                  ${stat.color === 'emerald' ? 'bg-emerald-500' : ''}
                  ${stat.color === 'orange' ? 'bg-orange-500' : ''}
                `} />
                <div className="relative flex items-center gap-4">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner border border-transparent
                    ${stat.color === 'blue' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/20' : ''}
                    ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20' : ''}
                    ${stat.color === 'orange' ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/20' : ''}
                  `}>
                    <stat.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{stat.label}</p>
                    <p className={`text-2xl font-black 
                      ${stat.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 
                        stat.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 
                        stat.color === 'orange' ? 'text-orange-600 dark:text-orange-400' : 
                        'text-slate-900 dark:text-white'}
                    `}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/80 backdrop-blur-sm p-4 shadow-sm border border-slate-200/60 dark:border-slate-700 transition-all hover:shadow-2xl flex flex-col justify-center"
            >
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-5 bg-slate-400 dark:bg-white group-hover:scale-150 transition-all group-hover:opacity-10" />
              <div className="flex justify-between items-center mb-3 px-1">
                <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Timeline Bar</p>
                <p className="text-[10px] font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">SEM {selectedSemester}</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5 relative">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem)}
                    className={`h-7 rounded-lg text-[10px] font-black transition-all ${
                      selectedSemester === sem
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-105"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-400 border border-transparent dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    S{sem}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* CONTROL CENTER */}
          <div className="flex flex-col md:flex-row gap-8 items-end justify-between px-2">
            <div className="flex-[2] w-full space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-8 bg-slate-900 dark:bg-white rounded-full" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                  Search By Subject Name
                </h3>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <BookOpen className="h-5 w-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Filter by subject name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[20px] py-4 pl-14 pr-6 text-sm font-bold focus:border-brand focus:ring-0 transition-all dark:text-white shadow-sm hover:shadow-md"
                />
              </div>
            </div>

            <div className="flex-1 w-full space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-2 w-8 bg-slate-900 dark:bg-white rounded-full" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                  Exam Weightage
                </h3>
              </div>
              <div className="h-[60px] w-full bg-slate-50 dark:bg-slate-900/50 rounded-[20px] flex items-center justify-between px-4 border-2 border-slate-100 dark:border-slate-800 transition-all hover:border-brand">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">Configure Structure</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mid/Int/End Sem Limits</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTempConfig(examConfig);
                    setShowConfigModal(true);
                  }}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-brand hover:text-white dark:hover:bg-brand text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>

          {/* SINGLE CONSOLIDATED LEDGER TABLE */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 px-2">
                <div className="h-10 w-10 rounded-2xl flex items-center justify-center border shadow-inner bg-indigo-500/10 border-indigo-500/20 text-indigo-500">
                <Layers className="h-5 w-5" />
                </div>
                <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Academic Subject Ledger</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sem-0{selectedSemester} Records</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
              <div className="lg:col-span-4 rounded-[30px] border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Grade Distribution</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sem {selectedSemester}</p>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 'bold' }}
                      />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ 
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                        }}
                        itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a', fontWeight: 'bold' }}
                        labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
                        formatter={(value) => [value, 'Subjects']}
                      />
                      <Bar 
                        dataKey="count" 
                        radius={[6, 6, 0, 0]} 
                        barSize={40}
                      >
                        {gradeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} className={entry.color} fill="currentColor" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Predictive Insights Panel */}
            {predictiveInsights.length > 0 && (
              <div className="rounded-[30px] border border-brand/20 dark:border-brand-500/20 bg-brand/5 dark:bg-brand-500/5 shadow-sm p-6 relative overflow-hidden mb-6">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/10 dark:bg-white/10 blur-2xl" />
                <button 
                  onClick={() => setIsInsightsOpen(!isInsightsOpen)}
                  className="flex items-center justify-between w-full group relative z-10"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-brand dark:text-white" />
                    <h4 className="text-sm font-black text-brand dark:text-white uppercase tracking-tight">Predictive Insights</h4>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-brand dark:text-white transition-transform duration-300 ${isInsightsOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence initial={false}>
                  {isInsightsOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {predictiveInsights.map((insight, idx) => (
                          <div key={idx} className={`p-4 rounded-2xl border ${insight.isAtRisk ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800' : 'bg-white/50 dark:bg-slate-900/50 border-white dark:border-slate-800'}`}>
                            <p className={`text-sm font-bold ${insight.isAtRisk ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {insight.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="overflow-x-auto rounded-[30px] border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-xl shadow-sm">
                <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                    <th className="py-5 px-4 text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100 text-center">Subject</th>
                    <th className="py-5 px-4 text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100 text-center">CREDITS</th>
                    <th className="py-5 px-4 text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100 text-center">Mid ({examConfig.mid.max})</th>
                    <th className="py-5 px-4 text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100 text-center">Int ({examConfig.int.max})</th>
                    <th className="py-5 px-4 text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100 text-center">End ({examConfig.end.max})</th>
                    <th className="py-5 px-4 text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100 text-center">Agg</th>
                    <th className="py-5 px-4 text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100 text-center">Grade</th>
                    <th className="py-5 px-4 text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100 text-center">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredMarks.length === 0 ? (
                        <tr>
                            <td colSpan="8" className="py-20 text-center text-sm font-bold text-slate-400">
                                No records found matching your search.
                            </td>
                        </tr>
                    ) : (
                        filteredMarks.map((mark, index) => (
                            <LedgerRow key={mark.id} mark={mark} onUpdate={handleUpdateInline} onDelete={deleteMark} examConfig={examConfig} />
                        ))
                    )}
                </tbody>
                </table>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Mark Modal */}
      <AnimatePresence>
        {showSubjectModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
          >
            <div className="rounded-[40px] bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/60 dark:border-slate-800/60 p-10 overflow-hidden relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
                style={{ backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`, backgroundSize: '24px 24px' }} 
              />
              
              <div className="flex items-center justify-between mb-10 relative">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingMark ? 'Update Marks' : 'Add Subject Marks'}
                  </h3>
                  <p className="text-sm font-bold text-slate-400">Input your academic performance for the ledger.</p>
                </div>
                <button
                  onClick={() => setShowSubjectModal(false)}
                  className="p-4 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 relative">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subject Node</label>
                  {!editingMark ? (
                    <select
                      value={newMark.subjectName}
                      onChange={(e) => {
                        if (e.target.value === "__add_new__") setShowGlobalSubjectModal(true);
                        else {
                          const found = subjects.find(s => s.name === e.target.value);
                          setNewMark({ ...newMark, subjectName: e.target.value, subjectCode: found?.courseCode || "" });
                        }
                      }}
                      className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 py-3 text-sm font-bold focus:border-brand focus:ring-0 transition-all dark:text-white"
                    >
                      <option value="" disabled>Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      <option value="__add_new__">+ Add New Node</option>
                    </select>
                  ) : (
                    <input type="text" value={newMark.subjectName} disabled className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-5 py-3 text-sm font-bold text-slate-400" />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subject Code</label>
                  <input
                    type="text"
                    value={newMark.subjectCode}
                    onChange={(e) => setNewMark({ ...newMark, subjectCode: e.target.value })}
                    placeholder="e.g. CS101"
                    className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 py-3 text-sm font-bold focus:border-brand focus:ring-0 transition-all dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Credits</label>
                  <input
                    type="number"
                    value={newMark.credits}
                    onChange={(e) => setNewMark({ ...newMark, credits: e.target.value })}
                    className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 py-3 text-sm font-bold focus:border-brand transition-all dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mid-Sem (25)</label>
                  <input
                    type="number"
                    value={newMark.midSem}
                    onChange={(e) => setNewMark({ ...newMark, midSem: e.target.value })}
                    className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 py-3 text-sm font-bold focus:border-brand transition-all dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Internals (25)</label>
                  <input
                    type="number"
                    value={newMark.internals}
                    onChange={(e) => setNewMark({ ...newMark, internals: e.target.value })}
                    className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 py-3 text-sm font-bold focus:border-brand transition-all dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">End-Sem (100)</label>
                  <input
                    type="number"
                    value={newMark.endSem}
                    onChange={(e) => setNewMark({ ...newMark, endSem: e.target.value })}
                    className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 py-3 text-sm font-bold focus:border-brand transition-all dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-12 relative">
                <button
                  onClick={() => setShowSubjectModal(false)}
                  className="px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Abort
                </button>
                <button
                  onClick={saveMark}
                  className="px-10 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingMark ? 'Update Ledger' : 'Commit Ledger'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exam Structure Config Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowConfigModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Exam Structure</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure Max Marks & Weightage</p>
                </div>
                <button onClick={() => setShowConfigModal(false)} className="p-3 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"><X size={20} /></button>
              </div>
              
              <div className="space-y-6">
                {['mid', 'int', 'end'].map(type => (
                  <div key={type} className="flex gap-4 items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-24">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{type === 'mid' ? 'Mid Sem' : type === 'int' ? 'Internals' : 'End Sem'}</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Max Marks</label>
                      <input 
                        type="number" 
                        value={tempConfig[type].max} 
                        onChange={(e) => setTempConfig({...tempConfig, [type]: { ...tempConfig[type], max: parseFloat(e.target.value) || 0 }})} 
                        className="w-full bg-white dark:bg-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 focus:border-brand outline-none transition-all" 
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Weightage</label>
                      <input 
                        type="number" 
                        value={tempConfig[type].weight} 
                        onChange={(e) => setTempConfig({...tempConfig, [type]: { ...tempConfig[type], weight: parseFloat(e.target.value) || 0 }})} 
                        className="w-full bg-white dark:bg-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm font-bold border-2 border-slate-200 dark:border-slate-700 focus:border-brand outline-none transition-all" 
                      />
                    </div>
                  </div>
                ))}
                
                <button onClick={() => {
                  setExamConfig(tempConfig);
                  localStorage.setItem("examStructureConfig", JSON.stringify(tempConfig));
                  setShowConfigModal(false);
                }} className="w-full mt-4 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2">
                  <Save size={16} /> Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Add Subject Modal */}
      <AnimatePresence>
        {showGlobalSubjectModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowGlobalSubjectModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">New Subject Node</h3>
                <button onClick={() => setShowGlobalSubjectModal(false)} className="p-3 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"><X size={20} /></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descriptor</label>
                  <input type="text" value={globalSubjectTarget.name} onChange={(e) => setGlobalSubjectTarget({...globalSubjectTarget, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold border-2 border-slate-100 dark:border-slate-800 focus:border-brand outline-none transition-all" placeholder="e.g. Quantum Physics" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Code</label>
                  <input type="text" value={globalSubjectTarget.courseCode} onChange={(e) => setGlobalSubjectTarget({...globalSubjectTarget, courseCode: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold border-2 border-slate-100 dark:border-slate-800 focus:border-brand outline-none transition-all" placeholder="e.g. PH101" />
                </div>
                <button onClick={handleAddNewGlobalSubject} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl transition-all hover:scale-105">Create Node</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
