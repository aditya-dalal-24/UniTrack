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
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { api } from "../services/api";

export default function ToDo() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load tasks from backend on mount
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await api.getTodos();
    if (apiError) {
      setError(apiError);
    } else {
      const mapped = (data || []).map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        dueDate: t.dueDate,
        dueTime: t.dueTime || "",
        completed: t.completed,
        createdAt: t.createdAt || new Date().toISOString()
      }));
      setTasks(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all"); // all, active, completed
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    dueTime: "",
  });

  // Get day of week from date
  const getDayOfWeek = (dateString) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  // Check if task is overdue
  const isOverdue = (dueDate, dueTime) => {
    if (!dueDate) return false;
    const now = new Date();
    // If no due time provided, compare dates only (end of day)
    if (!dueTime || dueTime === "00:00") {
      const due = new Date(dueDate + "T23:59:59");
      return due < now;
    }
    const taskDateTime = new Date(`${dueDate}T${dueTime}:00`);
    return taskDateTime < now;
  };

  // Add new task
  const addTask = async () => {
    if (!newTask.title || !newTask.dueDate) {
      alert("Please fill in at least the title and due date");
      return;
    }

    const { error: apiError } = await api.addTodo({
      title: newTask.title,
      description: newTask.description,
      dueDate: newTask.dueDate,
      dueTime: newTask.dueTime || "00:00",
    });

    if (apiError) {
      alert(apiError);
      return;
    }

    // Refresh tasks from backend to get new ID
    await fetchTasks();
    setNewTask({ title: "", description: "", dueDate: "", dueTime: "" });
    setShowModal(false);
  };

  // Delete task
  const deleteTask = async (id) => {
    const { error: apiError } = await api.deleteTodo(id);
    if (apiError) {
      alert(apiError);
      return;
    }
    setTasks(tasks.filter((t) => t.id !== id));
  };

  // Toggle task completion
  const toggleComplete = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const { error: apiError } = await api.updateTodo(id, {
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      completed: !task.completed,
    });

    if (apiError) {
      alert(apiError);
      return;
    }

    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // Start editing
  const startEdit = (task) => {
    setEditingId(task.id);
    setEditData({ ...task });
  };

  // Save edit
  const saveEdit = async () => {
    const { error: apiError } = await api.updateTodo(editingId, {
      title: editData.title,
      description: editData.description,
      dueDate: editData.dueDate,
      dueTime: editData.dueTime,
      completed: editData.completed,
    });

    if (apiError) {
      alert(apiError);
      return;
    }

    setTasks(tasks.map((t) => (t.id === editingId ? editData : t)));
    setEditingId(null);
    setEditData({});
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  // Filter tasks
  const filteredTasks = tasks
    .filter((task) => {
      if (filter === "active") return !task.completed;
      if (filter === "completed") return task.completed;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.dueDate}T${a.dueTime || "00:00"}`);
      const dateB = new Date(`${b.dueDate}T${b.dueTime || "00:00"}`);
      return dateA - dateB;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="To-Do List"
        description="Manage your tasks and stay organized"
        actions={
          <div className="flex gap-2">
            {tasks.length > 0 && (
              <button
                onClick={async () => {
                  if (!confirm("Are you sure you want to delete ALL tasks? This cannot be undone.")) return;
                  const { error: apiError } = await api.deleteAllTodos();
                  if (apiError) { alert(apiError); return; }
                  setTasks([]);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2.5 text-sm font-semibold hover:bg-red-500/20 transition-all active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand text-white px-4 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:bg-brand-dark transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["all", "active", "completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? "bg-brand text-white shadow-md"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-brand"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="text-center py-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <CheckCircle className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                No tasks found
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {filter === "all"
                  ? "Add a new task to get started"
                  : `No ${filter} tasks`}
              </p>
            </motion.div>
          ) : (
            filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: index * 0.05 }}
                layout
                className={`rounded-2xl bg-white dark:bg-slate-900 shadow-sm border p-6 hover:shadow-md transition-all group ${
                  task.completed
                    ? "border-green-200 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/10"
                    : isOverdue(task.dueDate, task.dueTime)
                    ? "border-red-200 dark:border-red-800/30"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                {editingId === task.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) =>
                        setEditData({ ...editData, title: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                      placeholder="Task title"
                    />
                    <textarea
                      value={editData.description}
                      onChange={(e) =>
                        setEditData({ ...editData, description: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm resize-none"
                      placeholder="Description"
                      rows="2"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={editData.dueDate}
                        onChange={(e) =>
                          setEditData({ ...editData, dueDate: e.target.value })
                        }
                        className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm"
                      />
                      <input
                        type="time"
                        value={editData.dueTime}
                        onChange={(e) =>
                          setEditData({ ...editData, dueTime: e.target.value })
                        }
                        className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/30 transition-all text-sm font-medium"
                      >
                        <Save size={14} /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all text-sm font-medium"
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleComplete(task.id)}
                      className="flex-shrink-0 mt-1"
                    >
                      {task.completed ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className="h-6 w-6 text-slate-400 hover:text-brand transition-colors" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-lg font-semibold mb-1 ${
                          task.completed
                            ? "line-through text-slate-500 dark:text-slate-400"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {task.description}
                        </p>
                      )}

                      {/* Date/Time Info */}
                      <div className="flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {new Date(task.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span>{getDayOfWeek(task.dueDate)}</span>
                        </div>
                        {task.dueTime && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{task.dueTime}</span>
                          </div>
                        )}
                        {!task.completed &&
                          isOverdue(task.dueDate, task.dueTime) && (
                            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>Overdue</span>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(task)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-all"
                        title="Edit task"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-all"
                        title="Delete task"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md border shadow-xl"
            >
              <h2 className="text-xl font-semibold mb-4">Add New Task</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all resize-none"
                    placeholder="Add a description"
                    rows="3"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) =>
                        setNewTask({ ...newTask, dueDate: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Due Time
                    </label>
                    <input
                      type="time"
                      value={newTask.dueTime}
                      onChange={(e) =>
                        setNewTask({ ...newTask, dueTime: e.target.value })
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={addTask}
                  className="px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark transition-all"
                >
                  Add Task
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
