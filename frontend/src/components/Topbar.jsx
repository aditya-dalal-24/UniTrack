import { useState, useEffect } from "react";
import { Moon, Sun, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";
import useDarkMode from "../hooks/useDarkMode.js";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";

export default function Topbar() {
  const [isDark, setIsDark] = useDarkMode();
  const { userData } = useAuth();
  const [profileData, setProfileData] = useState(null);

  // Fetch full profile from backend on mount
  useEffect(() => {
    async function fetchProfile() {
      const { data } = await api.getProfile();
      if (data) setProfileData(data);
    }
    fetchProfile();
  }, []);

  // Merge: prefer backend profile, fallback to auth context, then placeholder
  const p = profileData || {};
  const activeStudent = {
    name: p.name || userData?.name || "Student",
    email: p.email || userData?.email || "",
    phone: p.phone || userData?.phone || "",
    rollNumber: p.rollNumber || userData?.rollNumber || "",
    college: p.college || userData?.college || userData?.university || "",
    course: p.course || userData?.course || "",
    branch: p.branch || userData?.branch || "",
    semester: p.semester || userData?.semester || "",
    batch: p.batch || userData?.batch || "",
  };

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
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand to-accent flex items-center justify-center text-white text-lg font-bold shadow-md">
              {activeStudent.name.charAt(0)}
            </div>

            {/* Student Info */}
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {activeStudent.name}
              </h2>
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
