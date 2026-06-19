import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import WidgetShell from "./WidgetShell";

function ExpenseSnapshotWidgetInner({ data, loading, dragHandleProps, onHide }) {
  const navigate = useNavigate();

  if (!data) return null;

  const { monthlySpent, lastMonthSpent, trend } = data;
  const trendPositive = trend >= 0;

  return (
    <WidgetShell
      id="expense-snapshot"
      title="Expenses"
      icon={Wallet}
      dragHandleProps={dragHandleProps}
      onHide={onHide}
      scrollable={false}
      className="col-span-1 md:col-span-1"
    >
      <div className="flex flex-col h-full items-center justify-between text-center pb-1">
        <div className="w-full mt-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            This Month
          </p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none">
            ₹{monthlySpent.toLocaleString()}
          </p>
          
          {lastMonthSpent > 0 && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-bold bg-slate-50 dark:bg-slate-800/30 w-fit mx-auto px-2 py-1 rounded-full border border-slate-100 dark:border-slate-800">
              <span className={`flex items-center ${trendPositive ? 'text-red-500' : 'text-emerald-500'}`}>
                {trendPositive ? <TrendingUp className="h-3 w-3 mr-0.5" strokeWidth={2.5} /> : <TrendingDown className="h-3 w-3 mr-0.5" strokeWidth={2.5} />}
                {Math.abs(trend)}%
              </span>
              <span className="text-slate-500">vs last month</span>
            </div>
          )}
        </div>

        {/* Minimalist Sparkline */}
        {data.monthlyHistory && data.monthlyHistory.length > 1 && (
          <div className="flex items-end justify-center gap-1.5 h-16 w-full px-4 mb-2">
            {data.monthlyHistory.map((m, i) => {
              const max = Math.max(...data.monthlyHistory.map((h) => h.amount || 0), 1);
              const height = Math.max(4, ((m.amount || 0) / max) * 64);
              const isLast = i === data.monthlyHistory.length - 1;
              return (
                <div
                  key={i}
                  className={`group relative flex-1 rounded-sm transition-all ${
                    isLast
                      ? "bg-indigo-500 dark:bg-indigo-400"
                      : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                  }`}
                  style={{ height: `${height}px` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                    <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap border border-slate-700 dark:border-slate-200">
                      {m.month}: ₹{(m.amount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between w-full border-t border-slate-100 dark:border-slate-800/50 pt-3 px-2 mt-auto">
          <span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500">
             Last: ₹{lastMonthSpent.toLocaleString()}
          </span>
          <button
            onClick={() => navigate("/expenses")}
            className="group flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Details
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </WidgetShell>
  );
}

const ExpenseSnapshotWidget = memo(ExpenseSnapshotWidgetInner);
export default ExpenseSnapshotWidget;
