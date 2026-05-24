import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  Wallet,
  CheckSquare,
  CreditCard,
  Zap,
  ChevronRight,
  X,
} from "lucide-react";
import { getQuickActions, recordAction } from "../utils/behaviorEngine";

const ACTION_ICONS = {
  attendance: CalendarCheck,
  expense: Wallet,
  task: CheckSquare,
  fee: CreditCard,
};

const ACTION_COLORS = {
  attendance: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-400",
    hover: "hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
  },
  expense: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200/60 dark:border-amber-800/40",
    text: "text-amber-700 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
    hover: "hover:bg-amber-100 dark:hover:bg-amber-900/30",
  },
  task: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200/60 dark:border-blue-800/40",
    text: "text-blue-700 dark:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
    hover: "hover:bg-blue-100 dark:hover:bg-blue-900/30",
  },
  fee: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200/60 dark:border-purple-800/40",
    text: "text-purple-700 dark:text-purple-300",
    icon: "text-purple-600 dark:text-purple-400",
    hover: "hover:bg-purple-100 dark:hover:bg-purple-900/30",
  },
};

/**
 * QuickActionBar — Contextual one-tap action bar.
 *
 * Reads behavior data + current app state to surface the most
 * relevant 2-4 actions. Each chip executes with a single tap.
 *
 * Props:
 * @param {Object} appState - { unmarkedLectures, pendingTasks, pendingFees }
 * @param {Function} onAction - Callback: (actionId, module, action, context) => void
 * @param {string} className - Additional CSS classes
 */
export default function QuickActionBar({ appState = {}, actions: providedActions, onAction, className = "" }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    if (providedActions && providedActions.length > 0) {
      setActions(providedActions);
    } else {
      setActions(getQuickActions(appState));
    }
    setDismissed(false);
  }, [
    providedActions,
    appState.unmarkedLectures,
    appState.pendingTasks,
    appState.pendingFees,
  ]);

  const handleAction = useCallback(
    (act) => {
      // Record the interaction
      recordAction(act.module, "quick_action_used", { actionId: act.id });

      if (onAction) {
        onAction(act.id, act.module, act.action, act.context);
      } else {
        // Default navigation fallback
        const routes = {
          attendance: "/schedule",
          expense: "/expenses",
          task: "/tasks",
          fee: "/fees",
        };
        if (routes[act.module]) navigate(routes[act.module]);
      }
    },
    [onAction, navigate]
  );

  if (dismissed || actions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 p-4 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            <Zap className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Quick Actions
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Action Chips */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {actions.map((act, i) => {
            const colors = ACTION_COLORS[act.module] || ACTION_COLORS.task;
            const Icon = ACTION_ICONS[act.module] || Zap;

            return (
              <motion.button
                key={act.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  if (act.action && typeof act.action === 'function') {
                    act.action();
                  } else {
                    handleAction(act);
                  }
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200 active:scale-95 ${act.color ? act.color + ' border-transparent bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700' : colors.bg + ' ' + colors.border + ' ' + colors.text + ' ' + colors.hover}`}
              >
                {act.icon ? <act.icon className={`h-4 w-4 flex-shrink-0 ${act.color || colors.icon}`} /> : <Icon className={`h-4 w-4 flex-shrink-0 ${colors.icon}`} />}
                <span className="truncate max-w-[180px]">{act.title || act.label}</span>
                <ChevronRight className="h-3 w-3 opacity-40 flex-shrink-0" />
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
