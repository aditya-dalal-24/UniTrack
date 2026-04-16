import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  GraduationCap,
  BookOpen,
  CreditCard,
  ClipboardList,
  BarChart3,
} from "lucide-react";

const icons = [
  { Icon: CalendarCheck, label: "Attendance", color: "#10b981" },
  { Icon: GraduationCap, label: "Academics", color: "#6366f1" },
  { Icon: BookOpen, label: "Assignments", color: "#f59e0b" },
  { Icon: CreditCard, label: "Fees", color: "#ef4444" },
  { Icon: ClipboardList, label: "To-Do", color: "#8b5cf6" },
  { Icon: BarChart3, label: "Marks", color: "#06b6d4" },
];

/**
 * Reusable loading spinner with animated academic icons.
 *
 * Props:
 *   message  — optional text below the spinner (default: "Loading...")
 *   size     — "sm" | "md" | "lg" (default: "md")
 *   fullPage — if true, centers vertically in the viewport
 *   showColdStartMsg — if true, shows a "server waking up" hint after 8s
 */
export default function LoadingSpinner({ message = "Loading...", size = "md", fullPage = false, showColdStartMsg = false }) {
  const iconSize = { sm: 20, md: 32, lg: 48 };
  const containerSize = { sm: "h-10 w-10", md: "h-16 w-16", lg: "h-24 w-24" };

  const [activeIndex, setActiveIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % icons.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showColdStartMsg) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [showColdStartMsg]);

  // Progressive messages based on wait time
  const getColdStartMessage = () => {
    if (elapsed < 8) return null;
    if (elapsed < 20) return "The server is waking up — this may take up to a minute on the first load...";
    if (elapsed < 40) return "Still warming up... almost there! Free-tier servers sleep after inactivity.";
    return "This is taking longer than usual. The server may be deploying. Please wait...";
  };

  const coldMsg = showColdStartMsg ? getColdStartMessage() : null;

  const { Icon, color } = icons[activeIndex];

  return (
    <div className={`flex flex-col items-center justify-center gap-5 ${fullPage ? "min-h-[60vh]" : "py-12"}`}>
      {/* Animated icon container */}
      <div className={`relative ${containerSize[size]} flex items-center justify-center`}>
        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{ border: `2px solid ${color}20` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{ backgroundColor: `${color}10` }}
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Icon with crossfade */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative z-10"
          >
            <Icon size={iconSize[size]} style={{ color }} strokeWidth={1.8} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1.5">
        {icons.map((_, i) => (
          <motion.div
            key={i}
            className={`h-1.5 rounded-full ${i !== activeIndex ? 'bg-slate-300 dark:bg-slate-700' : ''}`}
            animate={{
              width: i === activeIndex ? 16 : 6,
              opacity: i === activeIndex ? 1 : 0.3,
            }}
            transition={{ duration: 0.3 }}
            style={i === activeIndex ? { backgroundColor: icons[i].color } : {}}
          />
        ))}
      </div>

      {message && (
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium animate-pulse">
          {message}
        </p>
      )}
      {coldMsg && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm text-center"
        >
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            ☀️ {coldMsg}
          </p>
          {elapsed >= 8 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="h-1 w-24 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full bg-slate-400 dark:bg-slate-600 rounded-full"
                  initial={{ width: "10%" }}
                  animate={{ width: "90%" }}
                  transition={{ duration: 50, ease: "linear" }}
                />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
