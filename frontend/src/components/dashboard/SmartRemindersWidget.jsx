import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CalendarCheck,
  AlertTriangle,
  ListTodo,
  Wallet,
  X,
} from "lucide-react";
import WidgetShell from "./WidgetShell";

const ICON_MAP = {
  calendar: CalendarCheck,
  alert: AlertTriangle,
  task: ListTodo,
  expense: Wallet,
};

const URGENCY_STYLES = {
  critical: "bg-red-50/80 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300",
  high: "bg-orange-50/80 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800/50 dark:text-orange-300",
  medium: "bg-amber-50/80 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-300",
  low: "bg-slate-50/80 border-slate-200 text-slate-700 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300",
};

function SmartRemindersWidgetInner({ reminders = [], loading, dragHandleProps, onHide }) {
  const [dismissed, setDismissed] = useState(new Set());

  if (!loading && reminders.length === 0) return null;

  const visibleReminders = reminders
    .filter((r) => !dismissed.has(r.id))
    .slice(0, 4);

  if (!loading && visibleReminders.length === 0) return null;

  const handleDismiss = (id) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  return (
    <WidgetShell
      id="smart-reminders"
      title="Reminders"
      icon={Bell}
      badge={visibleReminders.length > 0 ? String(visibleReminders.length) : null}
      loading={loading}
      collapsible={false}
      dragHandleProps={dragHandleProps}
      onHide={onHide}
      className="col-span-1 md:col-span-1"
    >
      <div className="flex flex-col items-center justify-center h-full gap-3 w-full">
        <AnimatePresence>
          {visibleReminders.map((reminder) => {
            const style = URGENCY_STYLES[reminder.urgency] || URGENCY_STYLES.low;
            const Icon = ICON_MAP[reminder.icon] || Bell;

            return (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center justify-between w-full p-2.5 rounded-lg border ${style}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                  <Icon className="h-4 w-4 flex-shrink-0 opacity-70" />
                  <p className="text-xs font-semibold leading-tight text-center w-full">
                    {reminder.text}
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(reminder.id)}
                  className="p-1 -mr-1 rounded opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </WidgetShell>
  );
}

const SmartRemindersWidget = memo(SmartRemindersWidgetInner);
export default SmartRemindersWidget;
