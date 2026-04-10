import { Moon, Sun, Mail, Phone, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import useDarkMode from "../hooks/useDarkMode.js";

const studentData = {
  name: "Aditya Dalal",
  email: "aditya.dalal@example.com",
  phone: "+91 98765 43210",
  rollNo: "24BCP170",
  class: "Computer Science - Year 2",
};

export default function Topbar() {
  const [isDark, setIsDark] = useDarkMode();

  return (
    <div className="sticky top-0 z-10 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur">
      {/* Student Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-200/40 dark:border-slate-800/40 bg-white/50 dark:bg-slate-900/50 px-4 py-3 md:px-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-brand to-accent flex items-center justify-center text-white text-xl font-bold shadow-md">
              {studentData.name.charAt(0)}
            </div>

            {/* Student Info */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {studentData.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {studentData.rollNo} • {studentData.class}
              </p>
            </div>
          </div>

          {/* Contact Info - Hidden on mobile */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Mail className="h-3.5 w-3.5 text-brand" />
              {studentData.email}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Phone className="h-3.5 w-3.5 text-brand" />
              {studentData.phone}
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDark((d) => !d)}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-9 w-9 hover:shadow-md hover:border-brand/60 transition-all"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-300" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
