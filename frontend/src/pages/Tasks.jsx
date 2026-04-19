import { useState, useEffect } from "react";
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
  Download,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { api } from "../services/api";
import { TASK_STATUS, TASK_TYPE } from "../constants/enums";

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(TASK_TYPE.ASSIGNMENT); // ASSIGNMENT or TODO
  const [filter, setFilter] = useState("all"); // all, active/pending, completed/submitted

  // Load tasks from backend
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await api.getTasks();
    if (apiError) {
      setError(apiError);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    dueTime: "00:00",
    type: TASK_TYPE.ASSIGNMENT,
    subject: "",
  });

  const handleMigrate = async () => {
    if (!confirm("This will import your legacy Assignments and Todos into the new unified Task system. Continue?")) return;
    setLoading(true);
    const { error } = await api.migrateTasks();
    if (error) alert(error);
    else await fetchTasks();
    setLoading(false);
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.dueDate) {
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

    await fetchTasks();
    setNewTask({ title: "", description: "", dueDate: "", dueTime: "00:00", type: activeTab, subject: "" });
    setShowModal(false);
  };

  const handleDeleteTask = async (id) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await api.deleteTask(id);
    if (error) alert(error);
    else setTasks(tasks.filter(t => t.id !== id));
  };

  const toggleTaskStatus = async (task) => {
    let nextStatus;
    if (task.type === TASK_TYPE.ASSIGNMENT) {
      nextStatus = task.status === TASK_STATUS.SUBMITTED ? TASK_STATUS.PENDING : TASK_STATUS.SUBMITTED;
    } else {
      nextStatus = task.status === TASK_STATUS.COMPLETED ? TASK_STATUS.PENDING : TASK_STATUS.COMPLETED;
    }

    const { error } = await api.updateTask(task.id, { ...task, status: nextStatus });
    if (error) alert(error);
    else {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    }
  };

  const handleSaveEdit = async () => {
    const { error } = await api.updateTask(editingId, editData);
    if (error) alert(error);
    else {
      setTasks(tasks.map(t => t.id === editingId ? editData : t));
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
            <button
              onClick={handleMigrate}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-2.5 text-sm font-semibold hover:bg-amber-500/20 transition-all border border-amber-500/20"
              title="Import from old modules"
            >
              <Download className="h-4 w-4" />
              Migrate Data
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand text-white px-4 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:bg-brand-dark transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add {activeTab === TASK_TYPE.ASSIGNMENT ? "Assignment" : "Task"}
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl w-fit relative border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab(TASK_TYPE.ASSIGNMENT)}
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
          onClick={() => setActiveTab(TASK_TYPE.TODO)}
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
          {/* Filters */}
          <div className="flex gap-2">
            {["all", "active", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === f ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800"}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredTasks.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No {activeTab.toLowerCase()}s found.</p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`group relative bg-white dark:bg-slate-900 p-6 rounded-3xl border shadow-sm hover:shadow-xl transition-all ${task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.SUBMITTED ? 'border-emerald-100 dark:border-emerald-900/30' : 'border-slate-200 dark:border-slate-800'}`}
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
                        <div className="flex justify-between items-start mb-4">
                          <button onClick={() => toggleTaskStatus(task)} className="p-1">
                            {task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.SUBMITTED ? (
                              <CheckCircle className="h-6 w-6 text-emerald-500" />
                            ) : (
                              <Circle className="h-6 w-6 text-slate-300 hover:text-brand transition-colors" />
                            )}
                          </button>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingId(task.id); setEditData(task); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
                              <Edit2 size={20} />
                            </button>
                            <button onClick={() => handleDeleteTask(task.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-slate-400 hover:text-red-500">
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>

                        <h3 className={`text-lg font-bold mb-2 ${task.status === TASK_STATUS.COMPLETED || task.status === TASK_STATUS.SUBMITTED ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {task.title}
                        </h3>
                        
                        {task.type === TASK_TYPE.ASSIGNMENT && task.subject && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-brand dark:text-slate-200 bg-brand/5 dark:bg-brand/20 w-fit px-2 py-1 rounded-lg mb-3">
                            <BookOpen size={22} /> {task.subject}
                          </div>
                        )}

                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                          {task.description || "No description provided."}
                        </p>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue(task.dueDate, task.dueTime, task.status) ? 'text-red-500' : 'text-slate-400'}`}>
                            <Calendar size={25} />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                          {isOverdue(task.dueDate, task.dueTime, task.status) && (
                            <span className="text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md">Overdue</span>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
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
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Add New {activeTab === TASK_TYPE.ASSIGNMENT ? "Assignment" : "To-Do"}</h3>
              <div className="space-y-4">
                <input 
                  placeholder="Task Title *" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand/20 text-slate-900 dark:text-white"
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                />
                <textarea 
                  placeholder="Details (optional)" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand/20 resize-none h-32 text-slate-900 dark:text-white"
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                />
                
                {activeTab === TASK_TYPE.ASSIGNMENT && (
                  <input 
                    placeholder="Subject (e.g., Mathematics)" 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-brand/20 text-slate-900 dark:text-white"
                    value={newTask.subject}
                    onChange={e => setNewTask({...newTask, subject: e.target.value})}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Due Date</label>
                      <input 
                        type="date" 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 outline-none text-slate-900 dark:text-white dark:[color-scheme:dark] relative z-10"
                        value={newTask.dueDate}
                        onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-bold text-slate-400 uppercase px-1">Due Time</label>
                      <input 
                        type="time" 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 outline-none text-slate-900 dark:text-white dark:[color-scheme:dark] relative z-10"
                        value={newTask.dueTime}
                        onChange={e => setNewTask({...newTask, dueTime: e.target.value})}
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
