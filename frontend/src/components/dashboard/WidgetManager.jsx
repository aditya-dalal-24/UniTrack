import { useState, useRef, useEffect } from "react";
import { Plus, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WIDGET_LABELS = {
  today: "Today",
  reminders: "Reminders",
  "attendance-risk": "Attendance Risk",
  "smart-tasks": "Tasks",
  "academic-pressure": "Pressure Level",
  "expense-snapshot": "Expenses",
  "semester-health": "Semester Health",
  "quick-actions": "Quick Actions",
};

export default function WidgetManager({ hiddenWidgets, onRestoreWidget }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!hiddenWidgets || hiddenWidgets.length === 0) {
    return null; // Don't show if no hidden widgets
  }

  return (
    <div className="relative inline-block mt-4" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Widget
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div className="p-1.5 space-y-0.5">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/50 mb-1">
                Hidden Widgets
              </div>
              {hiddenWidgets.map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    onRestoreWidget(id);
                    // Keep menu open if there are more, otherwise it will unmount
                  }}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors text-left"
                >
                  {WIDGET_LABELS[id] || id}
                  <Plus className="h-3.5 w-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
