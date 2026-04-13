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
  LogOut,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

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
  const { logout } = useAuth();

  return (
    <aside
      className={`relative z-20 h-screen flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur shadow-lg border-r border-slate-200/60 dark:border-slate-800/60 transition-all duration-300 flex-shrink-0 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-4">
        {!collapsed && (
          <div>
            <div className="text-xs font-semibold tracking-[0.25em] text-slate-400 border-l-2 border-brand pl-2 uppercase">
              UNITRACK
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
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`
            }
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarLink"
                    className="absolute inset-0 rounded-xl bg-slate-100 dark:bg-slate-800/80 -z-10"
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

      {/* Logout Button */}
      <div className="mt-auto p-4 border-t border-slate-200/60 dark:border-slate-800/60">
        <button
          onClick={logout}
          className={`relative flex items-center w-full ${
            collapsed ? "justify-center" : "gap-3 px-3"
          } py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all duration-200`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="truncate font-semibold"
            >
              Logout
            </motion.span>
          )}
        </button>
      </div>
    </aside>
  );
}
