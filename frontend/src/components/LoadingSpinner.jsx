import { motion } from "framer-motion";

/**
 * Reusable loading spinner with optional message.
 * Use inside any page/component while waiting for API data.
 *
 * Props:
 *   message  — optional text below the spinner (default: "Loading...")
 *   size     — "sm" | "md" | "lg" (default: "md")
 *   fullPage — if true, centers vertically in the viewport
 */
export default function LoadingSpinner({ message = "Loading...", size = "md", fullPage = false }) {
  const sizeMap = { sm: "h-6 w-6", md: "h-10 w-10", lg: "h-16 w-16" };
  const dotSize = { sm: "h-1.5 w-1.5", md: "h-2.5 w-2.5", lg: "h-3.5 w-3.5" };

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
    </div>
  );
}
