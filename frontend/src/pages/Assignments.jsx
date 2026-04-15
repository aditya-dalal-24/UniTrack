import { useState, useEffect } from "react";
import { PlusCircle, CheckCircle, Clock, Trash2, Edit2, Save, X, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import { ASSIGNMENT_STATUS } from "../constants/enums";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

export default function Assignments() {
  const [showModal, setShowModal] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load assignments from backend
  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    const { data, error: apiError } = await api.getAssignments();
    if (apiError) {
      setError(apiError);
    } else {
      const mapped = (data || []).map(a => ({
        id: a.id,
        title: a.title,
        subject: a.subject,
        due: a.dueDate,
        status: a.status
      })).sort((a, b) => new Date(a.due) - new Date(b.due));
      setAssignments(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const [newAssignment, setNewAssignment] = useState({
    title: "",
    subject: "",
    due: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const addAssignment = async () => {
    if (!newAssignment.title.trim() || !newAssignment.subject.trim() || !newAssignment.due) {
      alert("Please fill in all required fields.");
      return;
    }

    const { error: apiError } = await api.addAssignment({
      title: newAssignment.title,
      subject: newAssignment.subject,
      dueDate: newAssignment.due,
      status: ASSIGNMENT_STATUS.PENDING,
    });

    if (apiError) {
      alert(apiError);
      return;
    }

    // Refresh assignments from backend to get the new ID
    await fetchAssignments();
    setNewAssignment({ title: "", subject: "", due: "" });
    setShowModal(false);
  };

  const deleteAssignment = async (id) => {
    if (confirm("Are you sure you want to delete this assignment?")) {
      const { error: apiError } = await api.deleteAssignment(id);
      if (apiError) {
        alert(apiError);
        return;
      }
      setAssignments(assignments.filter((a) => a.id !== id));
    }
  };

  const startEdit = (assignment) => {
    setEditingId(assignment.id);
    setEditData({ ...assignment });
  };

  const saveEdit = async () => {
    const { error: apiError } = await api.updateAssignment(editingId, {
      title: editData.title,
      subject: editData.subject,
      dueDate: editData.due,
      status: editData.status,
    });

    if (apiError) {
      alert(apiError);
      return;
    }

    setAssignments(prev => 
      [...prev.map(a => a.id === editingId ? editData : a)].sort((a, b) => new Date(a.due) - new Date(b.due))
    );
    setEditingId(null);
    setEditData({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const toggleStatus = async (id) => {
    const assignment = assignments.find(a => a.id === id);
    if (!assignment) return;
    const newStatus = assignment.status === ASSIGNMENT_STATUS.PENDING 
      ? ASSIGNMENT_STATUS.SUBMITTED 
      : ASSIGNMENT_STATUS.PENDING;
    
    const { error: apiError } = await api.updateAssignment(id, {
      title: assignment.title,
      subject: assignment.subject,
      dueDate: assignment.due,
      status: newStatus,
    });

    if (apiError) {
      alert(apiError);
      return;
    }

    setAssignments(assignments.map(a =>
      a.id === id ? { ...a, status: newStatus } : a
    ));
  };


  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="animate-fadeInUp space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Assignments</h1>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand/10 text-brand hover:bg-brand/20 dark:bg-brand/20 dark:text-brand-400 dark:hover:bg-brand/30 ring-1 ring-inset ring-brand/10 dark:ring-brand/30 transition-all font-semibold shadow-sm"
        >
          <PlusCircle size={18} /> Add Assignment
        </button>
      </div>

      {/* Assignment Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {assignments.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="col-span-full flex flex-col items-center justify-center py-24 px-4 text-center rounded-3xl bg-white/50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 backdrop-blur-sm"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-brand/20 dark:bg-brand/30 blur-3xl rounded-full" />
                <div className="relative bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border shadow-2xl shadow-brand/10 dark:shadow-none">
                  <ClipboardList size={64} className="text-brand dark:text-brand-light" strokeWidth={1.5} />
                </div>
              </div>
              
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                All Captured!
              </h3>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-sm mb-10 leading-relaxed font-medium">
                No assignments found. Add your first one to start your journey towards academic excellence.
              </p>
              
              <button
                onClick={() => setShowModal(true)}
                className="group relative flex items-center gap-3 px-10 py-4 rounded-[1.25rem] bg-brand text-white font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand/25 dark:shadow-none overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <PlusCircle size={22} className="relative z-10" />
                <span className="relative z-10 text-lg">Create Assignment</span>
              </button>
            </motion.div>
          )}

          {assignments.map((a, index) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              layout
              className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6 hover:-translate-y-1 hover:shadow-lg transition-all group relative"
            >
            {editingId === a.id ? (
              // Edit Mode
              <div className="space-y-3">
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold"
                  placeholder="Assignment Title"
                />
                <input
                  type="text"
                  value={editData.subject}
                  onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm"
                  placeholder="Subject"
                />
                <input
                  type="date"
                  value={editData.due}
                  onChange={(e) => setEditData({ ...editData, due: e.target.value })}
                  className="w-full p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm"
                />
                <div className="flex gap-2 mt-4">
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
              <>
                <div className="flex justify-between items-start">
                  <h2 className="text-lg font-semibold pr-8">{a.title}</h2>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStatus(a.id)}
                      title={`Mark as ${a.status === ASSIGNMENT_STATUS.PENDING ? "Submitted" : "Pending"}`}
                    >
                      {a.status === ASSIGNMENT_STATUS.SUBMITTED ? (
                        <CheckCircle className="text-emerald-500" size={20} />
                      ) : a.status === ASSIGNMENT_STATUS.OVERDUE ? (
                        <div className="text-rose-500 flex items-center gap-1">
                          <Clock size={20} />
                        </div>
                      ) : (
                        <Clock className="text-indigo-500" size={20} />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(a)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-all"
                      title="Edit assignment"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteAssignment(a.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-all"
                      title="Delete assignment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Subject: <span className="font-medium">{a.subject}</span>
                </p>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Due: <span className="font-medium">{a.due}</span>
                </p>

                <span
                  className={`inline-block mt-3 px-3 py-1 text-xs rounded-full font-semibold
                    ${
                      a.status === ASSIGNMENT_STATUS.SUBMITTED
                        ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : a.status === ASSIGNMENT_STATUS.OVERDUE
                        ? "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                        : "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400"
                    }`}
                >
                  {a.status ? a.status.charAt(0) + a.status.slice(1).toLowerCase() : 'Pending'}
                </span>
              </>
            )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
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
            <h2 className="text-xl font-semibold mb-4">Add New Assignment</h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Assignment Title"
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none"
                value={newAssignment.title}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, title: e.target.value })
                }
              />

              <input
                type="text"
                placeholder="Subject"
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none"
                value={newAssignment.subject}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, subject: e.target.value })
                }
              />

              <input
                type="date"
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 outline-none"
                value={newAssignment.due}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, due: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800"
              >
                Cancel
              </button>

              <button
                onClick={addAssignment}
                className="px-6 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark transition-all active:scale-95 font-semibold"
              >
                Add
              </button>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
