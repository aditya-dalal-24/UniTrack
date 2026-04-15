import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * Reusable loading spinner with optional message.
 * Use inside any page/component while waiting for API data.
 *
 * Props:
 *   message  — optional text below the spinner (default: "Loading...")
 *   size     — "sm" | "md" | "lg" (default: "md")
 *   fullPage — if true, centers vertically in the viewport
 *   showColdStartMsg — if true, shows a "server waking up" hint after 8s
 */
export default function LoadingSpinner({ message = "Loading...", size = "md", fullPage = false, showColdStartMsg = false }) {
  const sizeMap = { sm: "h-6 w-6", md: "h-10 w-10", lg: "h-16 w-16" };
  const dotSize = { sm: "h-1.5 w-1.5", md: "h-2.5 w-2.5", lg: "h-3.5 w-3.5" };

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!showColdStartMsg) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [showColdStartMsg]);

  // Progressive messages based on wait time
  const getColdStartMessage = () => {
    if (elapsed < 8) return null;
    if (elapsed < 20) return "The server is waking up --- this may take up to a minute on the first load...";
    if (elapsed < 40) return "Still warming up... almost there! Free-tier servers sleep after inactivity.";
    return "This is taking longer than usual. The server may be deploying. Please wait...";
  };

  const coldMsg = showColdStartMsg ? getColdStartMessage() : null;

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${fullPage ? "min-h-[60vh]" : "py-12"}`}>
      <motion.div
        className={`relative ${sizeMap[size]}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className={`absolute ${dotSize[size]} rounded-full bg-brand`}
            style={{
              top: i < 2 ? 0 : "auto",
              bottom: i >= 2 ? 0 : "auto",
              left: i % 2 === 0 ? 0 : "auto",
              right: i % 2 === 1 ? 0 : "auto",
            }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </motion.div>
      {message && (
        <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
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
