import { useState, useEffect } from "react";
import { Plus, Trash2, Quote, Loader2 } from "lucide-react";
import { api } from "../../services/api";

export default function AdminThoughts() {
  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newThought, setNewThought] = useState({ text: "", author: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchThoughts();
  }, []);

  const fetchThoughts = async () => {
    setLoading(true);
    const { data, error: err } = await api.getAdminThoughts();
    if (err) setError(err);
    else setThoughts(data || []);
    setLoading(false);
  };

  const handleAddThought = async (e) => {
    e.preventDefault();
    if (!newThought.text || !newThought.author) return;
    
    setIsSubmitting(true);
    const { data, error: err } = await api.addAdminThought(newThought);
    if (err) {
      alert(err);
    } else {
      setThoughts([...thoughts, data]);
      setNewThought({ text: "", author: "" });
      setIsAdding(false);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this thought?")) return;
    
    const { error: err } = await api.deleteAdminThought(id);
    if (err) {
      alert(err);
    } else {
      setThoughts(thoughts.filter(t => t.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Thought of the Day</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage the daily motivational quotes shown on user dashboards.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark"
        >
          {isAdding ? <span className="px-2">Cancel</span> : <><Plus size={16} /> Add Thought</>}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {isAdding && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold mb-4 dark:text-white">Add New Thought</h2>
          <form onSubmit={handleAddThought} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Quote Text</label>
              <textarea
                required
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="E.g. The secret of getting ahead is getting started."
                value={newThought.text}
                onChange={(e) => setNewThought({ ...newThought, text: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Author</label>
              <input
                required
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="E.g. Mark Twain"
                value={newThought.author}
                onChange={(e) => setNewThought({ ...newThought, author: e.target.value })}
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Thought"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {thoughts.map((thought) => (
          <div key={thought.id} className="group relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div>
              <Quote className="h-8 w-8 text-brand/20 dark:text-brand-400/60 mb-4" />
              <p className="text-slate-700 dark:text-slate-300 italic mb-4">"{thought.text}"</p>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleDelete(thought.id)}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition dark:hover:bg-red-900/20"
                title="Delete Thought"
              >
                <Trash2 size={16} />
              </button>
              <span className="text-sm font-bold text-brand dark:text-brand-400">~ {thought.author}</span>
            </div>
          </div>
        ))}
        {thoughts.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            No thoughts available. Add some to inspire your students!
          </div>
        )}
      </div>
    </div>
  );
}
