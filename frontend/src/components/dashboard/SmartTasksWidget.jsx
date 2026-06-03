import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ListTodo, ArrowRight, AlertCircle, Check } from "lucide-react";
import WidgetShell from "./WidgetShell";

function SmartTasksWidgetInner({ data, loading, dragHandleProps, onHide }) {
  const navigate = useNavigate();

  if (!data) return null;

  const {
    overdueCount,
    pendingCount,
    completedCount,
    pendingAssignments,
    pendingTodos,
    hasOverdue,
    allCaughtUp,
  } = data;

  return (
    <WidgetShell
      id="smart-tasks"
      title="Tasks"
      icon={ListTodo}
      badge={pendingCount > 0 ? `${pendingCount}` : null}
      dragHandleProps={dragHandleProps}
      onHide={onHide}
      scrollable={false}
      className="col-span-1 md:col-span-2 lg:col-span-1"
    >
      {allCaughtUp ? (
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-full mb-2">
            <Check className="h-6 w-6 text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            All caught up
          </p>
          <p className="text-xs font-medium text-slate-500 mt-1">
            {completedCount} completed
          </p>
        </div>
      ) : (
        <div className="flex flex-col h-full items-center justify-center gap-6 w-full text-center py-2">
          <div className="w-full">
            {hasOverdue && (
              <div className="flex flex-col items-center justify-center p-2 mb-4 rounded-lg bg-red-50 border border-red-100 dark:bg-red-900/10 dark:border-red-800/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-500" strokeWidth={2.5} />
                  <p className="text-sm font-extrabold text-red-700 dark:text-red-400 leading-tight">
                    {overdueCount} Overdue
                  </p>
                </div>
                <p className="text-[10px] font-bold text-red-500/80 uppercase tracking-wider">
                  Needs immediate attention
                </p>
              </div>
            )}

            <div className="flex justify-center gap-8 px-4">
              <div className="flex flex-col items-center">
                <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 leading-none mb-1">
                  {pendingAssignments}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assignments</p>
              </div>
              <div className="w-px bg-slate-100 dark:bg-slate-800" />
              <div className="flex flex-col items-center">
                <p className="text-3xl font-extrabold text-sky-600 dark:text-sky-400 leading-none mb-1">
                  {pendingTodos}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To-dos</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between w-full border-t border-slate-100 dark:border-slate-800/50 pt-3 px-2 mt-auto">
            <span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500">
              {completedCount} done
            </span>
            <button
              onClick={() => navigate("/tasks")}
              className="group flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      )}
    </WidgetShell>
  );
}

const SmartTasksWidget = memo(SmartTasksWidgetInner);
export default SmartTasksWidget;
