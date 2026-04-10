import { motion } from "framer-motion";
import { cn } from "../utils/cn";

export default function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  color,
  description,
}) {
  const getColorClasses = (color) => {
    switch (color) {
      case "brand": return "bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300";
      case "emerald":
      case "green": return "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "red":
      case "rose": return "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
      case "amber":
      case "yellow": return "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400";
      case "accent":
      case "pink": return "bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400";
      default: return "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
            {value}
          </h3>
          {description && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {description}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            getColorClasses(color)
          )}
        >
          {Icon && <Icon className="h-6 w-6" />}
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span
            className={cn(
              "flex items-center font-medium",
              trendUp ? "text-emerald-500" : "text-red-500"
            )}
          >
            {trendUp ? "+" : "-"}
            {trend}
          </span>
          <span className="ml-2 text-slate-400 text-xs">from last month</span>
        </div>
      )}
    </motion.div>
  );
}
