import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Reusable error display with optional retry button.
 *
 * Props:
 *   message  — error text to show
 *   onRetry  — if provided, shows a "Try Again" button
 *   compact  — if true, renders inline instead of full-width card
 */
export default function ErrorMessage({ message = "Something went wrong.", onRetry, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 py-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-2 text-brand hover:text-brand-dark font-medium underline underline-offset-2 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 p-6 text-center"
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-3">
        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-1">
        Error
      </h3>
      <p className="text-sm text-red-700 dark:text-red-400 mb-4">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all text-sm font-medium active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      )}
    </motion.div>
  );
}
