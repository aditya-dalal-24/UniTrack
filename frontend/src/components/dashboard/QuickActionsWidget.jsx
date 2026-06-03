import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, CalendarPlus, ListPlus, Upload, Wallet } from "lucide-react";
import WidgetShell from "./WidgetShell";

const ACTIONS = [
  { id: "mark-attendance", label: "Attendance", icon: CalendarPlus, actionType: "wizard", color: "text-emerald-600 dark:text-emerald-400", hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-900/20", hoverBorder: "hover:border-emerald-200 dark:hover:border-emerald-800" },
  { id: "add-task", label: "Add Task", icon: ListPlus, route: "/tasks", color: "text-indigo-600 dark:text-indigo-400", hoverBg: "hover:bg-indigo-50 dark:hover:bg-indigo-900/20", hoverBorder: "hover:border-indigo-200 dark:hover:border-indigo-800" },
  { id: "upload-timetable", label: "Timetable", icon: Upload, route: "/schedule", color: "text-sky-600 dark:text-sky-400", hoverBg: "hover:bg-sky-50 dark:hover:bg-sky-900/20", hoverBorder: "hover:border-sky-200 dark:hover:border-sky-800" },
  { id: "quick-expense", label: "Expense", icon: Wallet, route: "/expenses", color: "text-amber-600 dark:text-amber-400", hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-900/20", hoverBorder: "hover:border-amber-200 dark:hover:border-amber-800" },
];

function QuickActionsWidgetInner({ onOpenWizard, loading, dragHandleProps, onHide }) {
  const navigate = useNavigate();

  const handleAction = (action) => {
    if (action.actionType === "wizard" && onOpenWizard) {
      onOpenWizard();
    } else if (action.route) {
      navigate(action.route);
    }
  };

  return (
    <WidgetShell
      id="quick-actions"
      title="Quick Actions"
      icon={Zap}
      dragHandleProps={dragHandleProps}
      onHide={onHide}
      scrollable={false}
      className="col-span-1 md:col-span-1"
    >
      <div className="flex flex-col h-full items-center justify-center">
        <div className="grid grid-cols-2 gap-3 w-full h-full">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                className={`group flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 transition-all active:scale-[0.97] ${action.hoverBg} ${action.hoverBorder}`}
              >
                <div className={`p-2 rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform ${action.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </WidgetShell>
  );
}

const QuickActionsWidget = memo(QuickActionsWidgetInner);
export default QuickActionsWidget;
