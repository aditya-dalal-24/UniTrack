import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Undo2 } from "lucide-react";

/**
 * UndoToast — A reusable toast with countdown timer and undo action.
 * Enables "one-tap then undo" patterns across all modules.
 *
 * Usage:
 *   const { showUndo, UndoToastComponent } = useUndoToast();
 *
 *   // Trigger:
 *   showUndo({
 *     message: "Marked all present",
 *     duration: 5000,
 *     onUndo: () => { revertAttendance(); },
 *     onExpire: () => { commitAttendance(); },
 *   });
 *
 *   // Render:
 *   return <>{UndoToastComponent}</>
 */

export function useUndoToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const [progress, setProgress] = useState(1);

  const clearToast = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
    setProgress(1);
  }, []);

  const showUndo = useCallback(
    ({ message, duration = 5000, onUndo, onExpire }) => {
      // Clear any existing toast
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      setToast({ message, onUndo, onExpire, duration });
      setProgress(1);
      startTimeRef.current = Date.now();

      // Animate countdown
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = 1 - elapsed / duration;

        if (remaining <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setToast(null);
          setProgress(1);
          if (onExpire) onExpire();
        } else {
          setProgress(remaining);
        }
      }, 50);
    },
    []
  );

  const handleUndo = useCallback(() => {
    if (toast?.onUndo) {
      toast.onUndo();
    }
    clearToast();
  }, [toast, clearToast]);

  const handleDismiss = useCallback(() => {
    if (toast?.onExpire) {
      toast.onExpire();
    }
    clearToast();
  }, [toast, clearToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const UndoToastComponent = (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[100]"
        >
          <div className="relative flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white shadow-2xl shadow-black/20 min-w-[280px] max-w-[400px] overflow-hidden border border-slate-700/50">
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-700/50 overflow-hidden rounded-b-2xl">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                style={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.05, ease: "linear" }}
              />
            </div>

            {/* Message */}
            <span className="text-sm font-medium flex-1 truncate">
              {toast.message}
            </span>

            {/* Undo button */}
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all uppercase tracking-wide flex-shrink-0"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { showUndo, clearToast, UndoToastComponent };
}
