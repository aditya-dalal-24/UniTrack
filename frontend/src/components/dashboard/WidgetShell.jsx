import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, GripVertical, EyeOff } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * WidgetShell — Reusable container for dashboard widgets.
 *
 * Features:
 * - Collapsible header (persisted to localStorage)
 * - Drag handle for dnd-kit
 * - Hide widget button
 * - Premium monochrome card styling with hover elevation
 */
function WidgetShellInner({
  id,
  title,
  icon: Icon,
  badge,
  loading = false,
  collapsible = true,
  defaultCollapsed = false,
  className,
  children,
  dragHandleProps, // from dnd-kit sortable
  onHide,
  scrollable = true,
}) {
  const storageKey = `widget_collapsed_${id}`;
  const [collapsed, setCollapsed] = useState(() => {
    if (!collapsible) return false;
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === "true" : defaultCollapsed;
  });

  useEffect(() => {
    if (collapsible) {
      localStorage.setItem(storageKey, String(collapsed));
    }
  }, [collapsed, storageKey, collapsible]);

  const toggleCollapse = () => {
    if (collapsible) setCollapsed((prev) => !prev);
  };

  return (
    <div
      className={cn(
        "rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col transition-all duration-200 hover:shadow-md hover:border-slate-300/80 dark:hover:border-slate-700 h-full",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100/80 dark:border-slate-800/40 group/header transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Drag Handle */}
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1.5 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:text-slate-600 dark:hover:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              title="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}

          {Icon && (
            <div className="p-1 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 flex-shrink-0">
              <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            </div>
          )}
          <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 tracking-wide">
            {title}
          </h3>
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 flex-shrink-0 border border-slate-200/60 dark:border-slate-700/60">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
          {collapsible && (
            <button
              onClick={toggleCollapse}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              title={collapsed ? "Expand" : "Collapse"}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  collapsed && "-rotate-90"
                )}
              />
            </button>
          )}
          {onHide && (
            <button
              onClick={onHide}
              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
              title="Hide widget"
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden flex-1 flex flex-col"
          >
            <div
              className={`flex-1 flex flex-col ${
                scrollable
                  ? "overflow-y-auto overflow-x-hidden custom-scrollbar"
                  : "overflow-hidden"
              }`}
            >
              <div className="p-4 pt-3 pb-5 flex-1 flex flex-col">
                {loading ? <WidgetSkeleton /> : children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3 animate-pulse flex-1">
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-3/4" />
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-1/2" />
      <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-full mt-4" />
    </div>
  );
}

const WidgetShell = memo(WidgetShellInner);
export default WidgetShell;
