import { memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  HeartPulse,
  CalendarCheck,
  TrendingUp,
  ListTodo,
  BookOpen,
} from "lucide-react";
import WidgetShell from "./WidgetShell";

function SemesterHealthWidgetInner({ data, loading, dragHandleProps, onHide }) {
  const navigate = useNavigate();

  if (!data) return null;

  const {
    attendanceHealth,
    sgpa,
    cgpa,
    pendingWork,
    totalSubjects,
  } = data;

  const items = [
    { label: "Attendance", value: `${Math.round(attendanceHealth)}%`, icon: CalendarCheck, route: "/schedule", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30" },
    { label: "SGPA", value: sgpa > 0 ? sgpa.toFixed(2) : "—", icon: TrendingUp, route: "/marks", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30" },
    { label: "Pending", value: String(pendingWork), icon: ListTodo, route: "/tasks", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30" },
    { label: "Subjects", value: String(totalSubjects), icon: BookOpen, route: "/schedule", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-900/10 border-sky-100 dark:border-sky-800/30" },
  ];

  return (
    <WidgetShell
      id="semester-health"
      title="Semester Health"
      icon={HeartPulse}
      dragHandleProps={dragHandleProps}
      onHide={onHide}
      scrollable={false}
      className="col-span-1 md:col-span-1"
    >
      <div className="flex flex-col h-full justify-center gap-4 text-center py-2">
        <div className="grid grid-cols-2 gap-2 h-full">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.route)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border hover:opacity-80 transition-opacity ${item.bg}`}
              >
                <div className={`flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider ${item.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </div>
                <span className="text-[15px] font-extrabold text-slate-900 dark:text-white leading-none">
                  {item.value}
                </span>
              </button>
            );
          })}
        </div>

        {cgpa > 0 && (
          <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/50 flex flex-col items-center justify-center gap-1 w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall CGPA</span>
            <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{cgpa.toFixed(2)}</span>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}

const SemesterHealthWidget = memo(SemesterHealthWidgetInner);
export default SemesterHealthWidget;
