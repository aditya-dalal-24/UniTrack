import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

export default function ThemeToggle() {
  const { isDark, toggleDarkMode } = useAuth();

  return (
    <motion.button
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleDarkMode}
      className="relative h-12 w-12 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-900 shadow-2xl shadow-brand/20 dark:shadow-none border border-slate-200 dark:border-slate-800 transition-all hover:border-brand/50 group overflow-hidden"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
        {/* Pulsating background glow */}
        <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ y: 20, opacity: 0, rotate: -45 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: -20, opacity: 0, rotate: 45 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="h-6 w-6 text-amber-400 fill-amber-400/20" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ y: 20, opacity: 0, rotate: -45 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: -20, opacity: 0, rotate: 45 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="h-6 w-6 text-amber-500 fill-amber-500/20" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
  );
}
