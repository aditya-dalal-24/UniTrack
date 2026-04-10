import { NavLink } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  BookOpen,
  BarChart2,
  ReceiptIndianRupee,
  Wallet,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Calendar,
  CheckSquare,
} from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/assignments", label: "Assignments", icon: BookOpen },
  { to: "/timetable", label: "Timetable", icon: Calendar },
  { to: "/marks", label: "Marks", icon: BarChart2 },
  { to: "/fees", label: "Fees", icon: ReceiptIndianRupee },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/todo", label: "To-Do", icon: CheckSquare },
  { to: "/profile", label: "Profile", icon: Users },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <aside
      className={`relative z-20 h-screen bg-white/80 dark:bg-slate-900/80 backdrop-blur shadow-lg border-r border-slate-200/60 dark:border-slate-800/60 transition-all duration-300 flex-shrink-0 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-4">
        {!collapsed && (
          <div>
            <div className="text-xs font-semibold tracking-[0.25em] text-slate-400 uppercase">
              Trackify
            </div>
            <div className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">
              Student Hub
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand hover:bg-slate-200 dark:hover:bg-slate-700 transition-all ${collapsed ? "mx-auto" : "ml-auto"}`}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="mt-4 space-y-2 px-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `relative flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 z-10 
              ${
                isActive
                  ? "text-brand dark:text-brand-300"
                  : "text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-brand-300"
              }`
            }
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarLink"
                    className="absolute inset-0 rounded-xl bg-brand/10 dark:bg-brand/20 -z-10"
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  />
                )}
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="truncate"
                  >
                    {label}
                  </motion.span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
