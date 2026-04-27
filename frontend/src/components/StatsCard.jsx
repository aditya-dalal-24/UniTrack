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
  onClick,
  className,
}) {
  const getColorClasses = (color) => {
    switch (color) {
      case "brand": return "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "emerald":
      case "green": return "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "red":
      case "rose": return "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400";
      case "amber":
      case "yellow": return "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
      case "accent":
      case "pink": return "bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400";
      default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5, scale: onClick ? 1.02 : 1 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60",
        onClick && "cursor-pointer transition-transform duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {title}
          </p>
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

      <div>
        <h3 className="text-4xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
          {value}
        </h3>
        {description && (
          <p className="mt-1 text-base text-slate-400 dark:text-slate-500 whitespace-pre-line">
            {description}
          </p>
        )}
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
