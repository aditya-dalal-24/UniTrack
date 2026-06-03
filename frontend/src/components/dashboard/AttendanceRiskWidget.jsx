import { memo } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import WidgetShell from "./WidgetShell";

function AttendanceRiskWidgetInner({ data, loading, dragHandleProps, onHide }) {
  if (!data) return null;

  const { atRiskSubjects, allSafe, overallPercentage, subjects } = data;

  return (
    <WidgetShell
      id="attendance-risk"
      title="Attendance Risk"
      icon={allSafe ? ShieldCheck : ShieldAlert}
      badge={!allSafe ? `${atRiskSubjects.length} risk` : null}
      loading={loading}
      dragHandleProps={dragHandleProps}
      onHide={onHide}
      className="col-span-1 md:col-span-1"
    >
      {allSafe ? (
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-full mb-2">
            <ShieldCheck className="h-6 w-6 text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            All subjects safe
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Overall: <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.round(overallPercentage)}%</span>
          </p>
        </div>
      ) : (
        <div className="flex flex-col h-full items-center justify-center gap-4 w-full py-2">
          <div className="w-full flex flex-col gap-2">
            {atRiskSubjects.map((s) => (
              <div
                key={s.name}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center ${
                  s.isCritical
                    ? "bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-800/30"
                    : "bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      s.isCritical ? "bg-red-500" : "bg-amber-500"
                    }`}
                  />
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                    {s.name}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-[11px] font-extrabold ${s.isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {Math.round(s.percentage)}%
                  </span>
                  <span className="text-[10px] text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2">
                    {s.safeSkips > 0 ? `Can skip ${s.safeSkips}` : "No skips left"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {subjects.filter((s) => !s.isAtRisk).length > 0 && (
            <div className="mt-auto pt-2 text-center w-full">
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                + {subjects.filter((s) => !s.isAtRisk).length} safe subjects
              </span>
            </div>
          )}
        </div>
      )}
    </WidgetShell>
  );
}

const AttendanceRiskWidget = memo(AttendanceRiskWidgetInner);
export default AttendanceRiskWidget;
