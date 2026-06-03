import { memo } from "react";
import { Activity, BookOpen, CalendarCheck, ListTodo } from "lucide-react";
import WidgetShell from "./WidgetShell";

const LEVEL_CONFIG = {
  low: {
    label: "Low",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-500",
    badgeBg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
    message: "Manageable workload.",
  },
  medium: {
    label: "Moderate",
    color: "text-indigo-700 dark:text-indigo-400",
    bg: "bg-indigo-500",
    badgeBg: "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800",
    message: "Stay consistent.",
  },
  high: {
    label: "High",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-500",
    badgeBg: "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800",
    message: "Focus on overdue tasks.",
  },
  critical: {
    label: "Critical",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-500",
    badgeBg: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
    message: "Prioritize attendance now.",
  },
};

const BREAKDOWN_ITEMS = [
  { key: "attendance", label: "Attendance", icon: CalendarCheck },
  { key: "tasks", label: "Tasks", icon: ListTodo },
];

function AcademicPressureWidgetInner({ data, loading, dragHandleProps, onHide }) {
  if (!data) return null;

  const { overall, level, breakdown } = data;
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.low;

  return (
    <WidgetShell
      id="academic-pressure"
      title="Pressure Level"
      icon={Activity}
      dragHandleProps={dragHandleProps}
      onHide={onHide}
      scrollable={false}
      className="col-span-1 md:col-span-1"
    >
      <div className="flex flex-col h-full justify-center gap-6 items-center text-center py-2">
        <div className="w-full">
          <div className="flex items-center justify-center gap-1">
            <span className={`text-4xl font-extrabold leading-none tracking-tighter ${config.color}`}>
              {overall}
            </span>
            <span className="text-sm font-bold text-slate-300 dark:text-slate-600 mb-1 mt-auto">/100</span>
          </div>
          
          <div className="mt-4 px-2">
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${config.bg}`}
                style={{ width: `${Math.min(100, overall)}%` }}
              />
            </div>
          </div>
          
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${config.badgeBg} ${config.color}`}>
              {config.label}
            </span>
            {data.reasons && data.reasons.length > 0 ? (
              <div className="flex flex-col items-center gap-0.5 max-h-12 overflow-y-auto w-full custom-scrollbar">
                {data.reasons.map((r, i) => (
                  <p key={i} className="text-[10px] text-slate-500 dark:text-slate-400 font-medium text-center leading-tight">
                    • {r}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 leading-tight max-w-[160px]">
                {config.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-6 mt-auto w-full pt-3 border-t border-slate-100 dark:border-slate-800/50">
          {BREAKDOWN_ITEMS.map(({ key, label, icon: Icon }) => {
            const value = breakdown[key] || 0;
            return (
              <div
                key={key}
                className="flex flex-col items-center"
              >
                <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 mb-1">
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </WidgetShell>
  );
}

const AcademicPressureWidget = memo(AcademicPressureWidgetInner);
export default AcademicPressureWidget;
