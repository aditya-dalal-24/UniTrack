import { memo, useState, useEffect } from "react";
import { Clock, MapPin, Check, X, Sunrise, ChevronRight } from "lucide-react";
import WidgetShell from "./WidgetShell";

function TodayWidgetInner({ data, onMarkAttendance, loading, dragHandleProps, onHide }) {
  const [timeNow, setTimeNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTimeNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const {
    totalLectures,
    completedCount,
    unmarkedCount,
    nextLecture,
    currentLecture,
    minutesUntilNext,
    tomorrowFirst,
    lectures,
  } = data;

  const formatCountdown = (mins) => {
    if (mins === null || mins === undefined) return "";
    if (mins <= 0) return "now";
    if (mins < 60) return `in ${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `in ${h}h ${m}m`;
  };

  const heroLecture = currentLecture || nextLecture;
  const isCurrentlyInClass = !!currentLecture;

  return (
    <WidgetShell
      id="today"
      title="Today"
      icon={Clock}
      badge={totalLectures > 0 ? `${completedCount}/${totalLectures}` : null}
      loading={loading}
      collapsible={false}
      dragHandleProps={dragHandleProps}
      onHide={onHide}
      className="col-span-1 md:col-span-2 lg:col-span-2"
    >
      {totalLectures === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-400">
          <p className="text-sm font-medium">No lectures today</p>
          {tomorrowFirst && (
             <div className="mt-2 text-xs flex items-center gap-1 text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
               <Sunrise className="h-3 w-3" /> Tomorrow at {tomorrowFirst.startTime}
             </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full justify-center gap-6 py-2">
          {heroLecture && (
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="flex flex-col items-center gap-1.5 w-full max-w-sm mx-auto p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {isCurrentlyInClass ? "Happening Now" : "Up Next"}
                  </p>
                  {isCurrentlyInClass && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  {!isCurrentlyInClass && minutesUntilNext !== null && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                      {formatCountdown(minutesUntilNext)}
                    </span>
                  )}
                </div>
                
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {heroLecture.subjectName || "Lecture"}
                </p>
                
                <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {heroLecture.startTime} – {heroLecture.endTime}
                  </span>
                  {heroLecture.roomNumber && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {heroLecture.roomNumber}
                    </span>
                  )}
                </div>

                {!heroLecture.status && onMarkAttendance && (
                  <div className="flex w-full gap-2 mt-3 pt-3 border-t border-indigo-100/50 dark:border-indigo-800/30">
                    <button
                      onClick={() => onMarkAttendance(heroLecture, "PRESENT")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:opacity-90 transition-opacity"
                    >
                      <Check className="h-3.5 w-3.5" /> Present
                    </button>
                    <button
                      onClick={() => onMarkAttendance(heroLecture, "ABSENT")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" /> Absent
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center w-full">
            <div className="flex flex-col gap-2 w-full pr-1 pb-1">
              {lectures.map((l, i) => (
                <div
                  key={l.slotId || i}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border text-xs font-semibold transition-colors ${
                    l.status === "PRESENT"
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-800/30 dark:text-emerald-400"
                      : l.status === "ABSENT"
                      ? "bg-red-50 border-red-100 text-red-600 dark:bg-red-900/10 dark:border-red-800/30 dark:text-red-400"
                      : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/30 dark:border-slate-700/50 dark:text-slate-300"
                  }`}
                >
                  <span className="truncate flex-1 text-left max-w-[200px]">{l.subjectName}</span>
                  <span className="opacity-70 text-[11px] ml-2 flex-shrink-0 font-medium">{l.startTime} - {l.endTime}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-[11px] text-slate-500 w-full pt-3 border-t border-slate-100 dark:border-slate-800/50">
              <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
                {unmarkedCount > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">{unmarkedCount} unmarked</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">All marked</span>
                )}
              </span>
              {tomorrowFirst && (
                <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
                  <Sunrise className="h-3 w-3 text-slate-400" />
                  Tomorrow at {tomorrowFirst.startTime}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </WidgetShell>
  );
}

const TodayWidget = memo(TodayWidgetInner);
export default TodayWidget;
