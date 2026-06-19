import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  CheckCircle,
  Circle,
  Trash2,
  Edit2,
  Save,
  X,
  Calendar,
  Clock,
  AlertCircle,
  ClipboardList,
  CheckSquare,
  BookOpen,
  Filter,
  Zap,
  CornerDownLeft,
  CalendarClock,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { api } from "../services/api";
import { useData } from "../contexts/DataContext";
import { TASK_STATUS, TASK_TYPE } from "../constants/enums";
import Pagination from "../components/Pagination";
import { recordAction, getSmartDefaults } from "../utils/behaviorEngine";
import { parseTaskString } from "../utils/nlp";


const TILE_COLORS = [
  "bg-blue-100/50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-600/40",
  "bg-emerald-100/50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-600/40",
  "bg-rose-100/50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-600/40",
  "bg-amber-100/50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-600/40",
  "bg-purple-100/50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-600/40",
  "bg-indigo-100/50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-600/40",
];

export default function Tasks() {
  const { invalidateDashboard } = useData();
  const location = useLocation();
  const [subjects, setSubjects] = useState([]);
  const userSemester = useMemo(() => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    return parseInt(userData.semester) || 1;
  }, []);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(TASK_TYPE.ASSIGNMENT); // ASSIGNMENT or TODO
  const [filter, setFilter] = useState("all"); // all, active/pending, completed/submitted
  const [currentPage, setCurrentPage] = useState(0);

  const [inlineInput, setInlineInput] = useState("");
  const [inlineLoading, setInlineLoading] = useState(false);

  const handleInlineTaskAdd = async (e) => {
    if (e.key === "Enter" && inlineInput.trim()) {
      if (inlineLoading) return;
      setInlineLoading(true);
      const parsed = parseTaskString(inlineInput, subjects);
      
      let finalType = parsed.type !== "OTHER" ? parsed.type : activeTab;
      if (finalType !== TASK_TYPE.ASSIGNMENT && finalType !== TASK_TYPE.TODO) {
        finalType = TASK_TYPE.ASSIGNMENT;
      }

      const payload = {
        title: parsed.title,
        type: finalType,
        subject: parsed.subject,
        dueDate: parsed.dueDate || new Date().toISOString().split("T")[0],
        dueTime: "23:59",
      };

      const { error: apiError } = await api.addTask(payload);

      if (!apiError) {
        setInlineInput("");
        fetchTasks(true);
        invalidateDashboard();
        recordAction("task", "inline_add_task", { type: payload.type });
      } else {
        alert(apiError);
      }
      setInlineLoading(false);
    }
  };
  const [pageSize, setPageSize] = useState(12);

  // Load tasks from backend
  const fetchTasks = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    const { data, error: apiError } = await api.getTasks();
    if (apiError) {
      setError(apiError);
    } else {
      setTasks(data || []);
    }
    if (showSpinner) setLoading(false);
  };

  const fetchSubjects = async () => {
    try {
      const [ttRes, subRes] = await Promise.all([
        api.getTimetable(),
        api.getSubjects() // Fallback to backend's authoritative current semester
      ]);

      const combined = new Map();
      
      // Add subjects from timetable
      if (ttRes.data && Array.isArray(ttRes.data)) {
        ttRes.data.forEach(slot => {
          if (!slot.isBreak && slot.subjectName && slot.subjectName.trim()) {
            const name = slot.subjectName.trim();
            if (!combined.has(name.toLowerCase())) {
              combined.set(name.toLowerCase(), { id: slot.subjectId || `tt-${slot.id}`, name });
            }
          }
        });
      }

      // Merge with actual subjects list
      if (subRes.data && Array.isArray(subRes.data)) {
        subRes.data.forEach(sub => {
          if (sub.name && sub.name.trim()) {
            const name = sub.name.trim();
            if (!combined.has(name.toLowerCase())) {
              combined.set(name.toLowerCase(), sub);
            }
          }
        });
      }

      setSubjects(Array.from(combined.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchSubjects();
  }, [userSemester]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    dueTime: "00:00",
    type: TASK_TYPE.ASSIGNMENT,
    subject: "",
  });

  // Handle command palette / dashboard navigation state
  useEffect(() => {
    if (location.state?.openAdd) {
      setNewTask(prev => ({
        ...prev,
        dueDate: new Date().toISOString().split('T')[0],
        dueTime: "23:59",
        type: activeTab,
      }));
      setShowModal(true);
      // Clear the state so re-renders don't reopen
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Listen for unitrack:command events from CommandPalette
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.openAdd) {
        setNewTask(prev => ({
          ...prev,
          dueDate: new Date().toISOString().split('T')[0],
          dueTime: "23:59",
          type: activeTab,
        }));
        setShowModal(true);
      }
    };
    window.addEventListener("unitrack:command", handler);
    return () => window.removeEventListener("unitrack:command", handler);
  }, [activeTab]);


  const handleAddTask = async () => {
    if (!newTask.title?.trim() || !newTask.dueDate) {
      alert("Title and Due Date are required.");
      return;
    }

    const payload = {
      ...newTask,
      type: activeTab,
      status: activeTab === TASK_TYPE.ASSIGNMENT ? TASK_STATUS.PENDING : TASK_STATUS.PENDING
    };

    const { error: apiError } = await api.addTask(payload);
    if (apiError) {
      alert(apiError);
      return;
    }

    await fetchTasks(false); // Silent refresh without spinner
    invalidateDashboard();
    recordAction("task", "add_task", { type: activeTab, subject: newTask.subject || "" });
    setNewTask({ title: "", description: "", dueDate: "", dueTime: "00:00", type: activeTab, subject: "" });
    setShowModal(false);
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("Delete this task?")) return;
    setActionLoading(id);
    const prevTasks = [...tasks];
    setTasks(tasks.filter(t => t.id !== id)); // Optimistic UI
    
    const { error } = await api.deleteTask(id);
    setActionLoading(null);
    invalidateDashboard();
    if (error) {
      alert(error);
      setTasks(prevTasks); // Revert on failure
    }
  };

  const toggleTaskStatus = async (task) => {
    if (actionLoading === task.id) return; // Prevent spam
    setActionLoading(task.id);
    
    let nextStatus;
    if (task.type === TASK_TYPE.ASSIGNMENT) {
      nextStatus = task.status === TASK_STATUS.SUBMITTED ? TASK_STATUS.PENDING : TASK_STATUS.SUBMITTED;
    } else {
      nextStatus = task.status === TASK_STATUS.COMPLETED ? TASK_STATUS.PENDING : TASK_STATUS.COMPLETED;
    }

    const prevTasks = [...tasks];
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t)); // Optimistic UI

    const { error } = await api.updateTask(task.id, { ...task, status: nextStatus });
    setActionLoading(null);
    invalidateDashboard();
    if (error) {
      alert(error);
      setTasks(prevTasks); // Revert on failure
    }
  };

  const handleSaveEdit = async () => {
    setActionLoading(editingId);
    const prevTasks = [...tasks];
    setTasks(tasks.map(t => t.id === editingId ? editData : t)); // Optimistic UI
    
    const { error } = await api.updateTask(editingId, editData);
    setActionLoading(null);
    invalidateDashboard();
    if (error) {
      alert(error);
      setTasks(prevTasks); // Revert on failure
    } else {
      setEditingId(null);
    }
  };

  const filteredTasks = tasks
    .filter(t => t.type === activeTab)
    .filter(t => {
      if (filter === "completed") {
        return t.status === TASK_STATUS.COMPLETED || t.status === TASK_STATUS.SUBMITTED;
      }
      if (filter === "active") {
        return t.status === TASK_STATUS.PENDING || t.status === TASK_STATUS.OVERDUE;
      }
      return true;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Group tasks by overdue / due today / upcoming / completed
  const groupedTasks = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const groups = { overdue: [], today: [], upcoming: [], completed: [] };

    filteredTasks.forEach(t => {
      if (t.status === TASK_STATUS.COMPLETED || t.status === TASK_STATUS.SUBMITTED) {
        groups.completed.push(t);
      } else if (t.dueDate < todayStr) {
        groups.overdue.push(t);
      } else if (t.dueDate === todayStr) {
        groups.today.push(t);
      } else {
        groups.upcoming.push(t);
      }
    });
    return groups;
  }, [filteredTasks]);

  const handlePostpone = async (task) => {
    const nextDate = new Date(task.dueDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const newDueDate = nextDate.toISOString().split("T")[0];
    const prevTasks = [...tasks];
    setTasks(tasks.map(t => t.id === task.id ? { ...t, dueDate: newDueDate } : t));
    const { error } = await api.updateTask(task.id, { ...task, dueDate: newDueDate });
    if (error) {
      setTasks(prevTasks);
    }
    invalidateDashboard();
  };

  // Paginate
  const paginatedTasks = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  // Reset page when tab or filter changes
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setCurrentPage(0);
  }, []);

  const handleFilterChange = useCallback((f) => {
    setFilter(f);
    setCurrentPage(0);
  }, []);

  const isOverdue = (dueDate, dueTime, status) => {
    if (status === TASK_STATUS.COMPLETED || status === TASK_STATUS.SUBMITTED) return false;
    const now = new Date();
    const taskDate = new Date(`${dueDate}T${dueTime || "23:59"}`);
    return taskDate < now;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unified Tasks"
        description="Manage your assignments and todos in one place."
        actions={
              <div className="flex gap-2">
                <div className="relative group">
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 h-full"
                  >
                    <Filter className="h-4 w-4" />
                    Bulk Actions
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                    <button
                      onClick={async () => {
                        const tasksToUpdate = filteredTasks.filter(t => t.status === TASK_STATUS.PENDING || t.status === TASK_STATUS.OVERDUE);
                        if (tasksToUpdate.length === 0) return;
                        
                        setLoading(true);
                        const nextStatus = activeTab === TASK_TYPE.ASSIGNMENT ? TASK_STATUS.SUBMITTED : TASK_STATUS.COMPLETED;
                        await Promise.allSettled(tasksToUpdate.map(t => api.updateTask(t.id, { ...t, status: nextStatus })));
                        await fetchTasks(false);
                        invalidateDashboard();
                        setLoading(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" /> Mark all as done
                    </button>
                    <button
                      onClick={async () => {
                        const tasksToDelete = filteredTasks;
                        if (tasksToDelete.length === 0) return;
                        
                        setLoading(true);
                        await Promise.allSettled(tasksToDelete.map(t => api.deleteTask(t.id)));
                        await fetchTasks(false);
                        invalidateDashboard();
                        setLoading(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 border-t border-slate-100 dark:border-slate-700/50"
                    >
                      <Trash2 className="h-4 w-4" /> Clear all
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const defaultType = activeTab === TASK_TYPE.ALL ? TASK_TYPE.TODO : activeTab;
                    const defaults = getSmartDefaults("tasks", "add_task");
                    setNewTask({
                      title: "",
                      description: "",
                      dueDate: defaults.dueDate || new Date().toISOString().split('T')[0],
                      dueTime: "23:59",
                      type: defaultType,
                      subject: defaults.subject || "",
                    });
                    if (
                      defaultType !== activeTab
                    ) {
                      setActiveTab(defaultType);
                    }
                    setShowModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 text-sm font-semibold shadow-xl shadow-brand/20 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add {activeTab === TASK_TYPE.ASSIGNMENT ? "Assignment" : "Task"}
                </button>
              </div>
        }
      />

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl w-fit relative border border-slate-200 dark:border-slate-700 mb-6">
        <button
          onClick={() => handleTabChange(TASK_TYPE.ASSIGNMENT)}
          className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-200 ${
            activeTab === TASK_TYPE.ASSIGNMENT
              ? "text-white"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {activeTab === TASK_TYPE.ASSIGNMENT && (
            <motion.div
              layoutId="activeTabBackground"
              className="absolute inset-0 bg-brand rounded-xl shadow-lg shadow-brand/20 -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <BookOpen className="h-4 w-4" />
          Assignments
        </button>
        <button
          onClick={() => handleTabChange(TASK_TYPE.TODO)}
          className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-200 ${
            activeTab === TASK_TYPE.TODO
              ? "text-white"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {activeTab === TASK_TYPE.TODO && (
            <motion.div
              layoutId="activeTabBackground"
              className="absolute inset-0 bg-brand rounded-xl shadow-lg shadow-brand/20 -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <CheckSquare className="h-4 w-4" />
          To-Dos
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} onRetry={fetchTasks} />}

      {!loading && !error && (
        <div className="space-y-4">

          {/* Inline Quick Add */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Zap className="h-5 w-5 text-brand dark:text-brand-400" />
            </div>
            <input
              type="text"
              value={inlineInput}
              onChange={(e) => setInlineInput(e.target.value)}
              onKeyDown={handleInlineTaskAdd}
              placeholder='Try "Finish OS assignment by tomorrow"...'
              disabled={inlineLoading}
              className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:opacity-50 transition-all"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
              {inlineLoading ? <span className="animate-spin text-sm">⌛</span> : <CornerDownLeft className="h-4 w-4" />}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {["all", "active", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === f ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800"}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedTasks.length === 0 && filteredTasks.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No {activeTab.toLowerCase()}s found.</p>
                </div>
              ) : (
                <>
                  {/* Section headers & grouped tasks */}
                  {groupedTasks.overdue.length > 0 && paginatedTasks.some(t => groupedTasks.overdue.includes(t)) && (
                    <div className="col-span-full">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-xs font-black uppercase tracking-wider text-red-500">Overdue</span>
                        <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded">{groupedTasks.overdue.length}</span>
                      </div>
                    </div>
                  )}

                  {paginatedTasks.map((task, idx) => {
                    // Insert section headers at group boundaries
                    const prevTask = idx > 0 ? paginatedTasks[idx - 1] : null;
                    const taskGroup = (task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.SUBMITTED)
                      ? "completed"
                      : task.dueDate < new Date().toISOString().split("T")[0]
                      ? "overdue"
                      : task.dueDate === new Date().toISOString().split("T")[0]
                      ? "today"
                      : "upcoming";
                    const prevGroup = prevTask
                      ? (prevTask.status === TASK_STATUS.COMPLETED || prevTask.status === TASK_STATUS.SUBMITTED)
                        ? "completed"
                        : prevTask.dueDate < new Date().toISOString().split("T")[0]
                        ? "overdue"
                        : prevTask.dueDate === new Date().toISOString().split("T")[0]
                        ? "today"
                        : "upcoming"
                      : null;

                    const showHeader = prevGroup !== null && prevGroup !== taskGroup;
                    const headerLabels = {
                      today: { label: "Due Today", icon: Clock, color: "text-amber-600 dark:text-amber-400" },
                      upcoming: { label: "Upcoming", icon: Calendar, color: "text-blue-600 dark:text-blue-400" },
                      completed: { label: "Completed", icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400" },
                    };
                    const headerInfo = headerLabels[taskGroup];
                    const HeaderIcon = headerInfo?.icon;

                    return (
                      <>
                        {showHeader && headerInfo && (
                          <div key={`header-${taskGroup}`} className="col-span-full mt-2">
                            <div className="flex items-center gap-2 mb-2">
                              {HeaderIcon && <HeaderIcon className={`h-4 w-4 ${headerInfo.color}`} />}
                              <span className={`text-xs font-black uppercase tracking-wider ${headerInfo.color}`}>{headerInfo.label}</span>
                            </div>
                          </div>
                        )}
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => {
                            if (editingId !== task.id) toggleTaskStatus(task);
                          }}
                          className={`group relative p-5 sm:p-6 rounded-3xl border shadow-sm hover:shadow-xl cursor-pointer transition-all ${
                            task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.SUBMITTED 
                            ? 'bg-emerald-50/30 border-emerald-200/50 dark:bg-emerald-900/10 dark:border-emerald-800/30' 
                            : `${TILE_COLORS[task.id % TILE_COLORS.length]}`
                          }`}
                        >
                          {editingId === task.id ? (
                            <div className="space-y-3">
                              <input 
                                className="w-full text-lg font-bold bg-transparent border-b border-brand outline-none text-slate-900 dark:text-white" 
                                value={editData.title} 
                                onChange={e => setEditData({...editData, title: e.target.value})} 
                              />
                              <textarea 
                                className="w-full text-sm bg-slate-50 dark:bg-slate-800 p-2 rounded-xl outline-none text-slate-900 dark:text-slate-100" 
                                value={editData.description} 
                                onChange={e => setEditData({...editData, description: e.target.value})} 
                              />
                              <div className="flex gap-2">
                                <input type="date" className="flex-1 text-xs p-2 rounded-lg border dark:bg-slate-800 dark:text-white dark:border-slate-700" value={editData.dueDate} onChange={e => setEditData({...editData, dueDate: e.target.value})} />
                                <button onClick={handleSaveEdit} className="p-2 bg-brand text-white rounded-lg"><Save size={16}/></button>
                                <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg"><X size={16}/></button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start mb-3">
                                <button onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task); }} className="p-1.5 -ml-1">
                                  {task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.SUBMITTED ? (
                                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                                  ) : (
                                    <Circle className="h-6 w-6 text-slate-300 hover:text-brand transition-colors" />
                                  )}
                                </button>
                                <div className="flex gap-0.5">
                                  {/* Quick Postpone */}
                                  {task.status !== TASK_STATUS.COMPLETED && task.status !== TASK_STATUS.SUBMITTED && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handlePostpone(task); }}
                                      className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl text-slate-400 hover:text-amber-500 transition-colors"
                                      title="Postpone +1 day"
                                    >
                                      <CalendarClock size={18} />
                                    </button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); setEditingId(task.id); setEditData(task); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
                                    <Edit2 size={18} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-slate-400 hover:text-red-500">
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>

                              <h3 className={`text-lg font-bold mb-2 break-words ${task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.SUBMITTED ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                {task.title}
                              </h3>
                              
                              {task.type === TASK_TYPE.ASSIGNMENT && task.subject && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-brand dark:text-slate-200 bg-brand/5 dark:bg-brand/20 w-fit max-w-full px-2 py-1 rounded-lg mb-3">
                                  <BookOpen size={16} className="flex-shrink-0" /> <span className="truncate">{task.subject}</span>
                                </div>
                              )}

                              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                                {task.description || "No description provided."}
                              </p>

                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue(task.dueDate, task.dueTime, task.status) ? 'text-red-500' : 'text-slate-400'}`}>
                                  <Calendar size={16} className="flex-shrink-0" />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                                {isOverdue(task.dueDate, task.dueTime, task.status) && (
                                  <span className="text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md">Overdue</span>
                                )}
                              </div>
                            </>
                          )}
                        </motion.div>
                      </>
                    );
                  })}
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {filteredTasks.length > pageSize && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredTasks.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[12, 24, 48]}
            />
          )}
        </div>
      )}

      {/* Add Task Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Add New {activeTab === TASK_TYPE.ASSIGNMENT ? "Assignment" : "To-Do"}</h3>
              <div className="space-y-4">
                <input 
                  placeholder="Task Title *" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand/20 text-slate-900 dark:text-white"
                  value={newTask.title}
                  onChange={e => setNewTask(prev => ({...prev, title: e.target.value}))}
                />
                <textarea 
                  placeholder="Details (optional)" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand/20 resize-none h-32 text-slate-900 dark:text-white"
                  value={newTask.description}
                  onChange={e => setNewTask(prev => ({...prev, description: e.target.value}))}
                />
                
                {activeTab === TASK_TYPE.ASSIGNMENT && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Subject</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand/20 text-slate-900 dark:text-white hover:cursor-pointer"
                      value={newTask.subject}
                      onChange={e => setNewTask(prev => ({...prev, subject: e.target.value}))}
                    >
                      <option value="">Select Subject (Optional)</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Due Date</label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 outline-none text-slate-900 dark:text-white dark:[color-scheme:dark] relative z-10"
                        value={newTask.dueDate}
                        onChange={e => setNewTask(prev => ({...prev, dueDate: e.target.value}))}
                        required
                      />
                    </div>
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Due Time</label>
                      <input 
                        type="time" 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 outline-none text-slate-900 dark:text-white dark:[color-scheme:dark] relative z-10"
                        value={newTask.dueTime}
                        onChange={e => setNewTask(prev => ({...prev, dueTime: e.target.value}))}
                      />
                    </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">Cancel</button>
                <button onClick={handleAddTask} className="flex-1 py-4 font-bold bg-brand text-white rounded-2xl shadow-lg shadow-brand/20 hover:scale-[1.02] transition-all">Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
