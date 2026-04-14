import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, Reorder, AnimatePresence, useDragControls } from "framer-motion";
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
  GripVertical,
  RotateCcw,
  ShieldCheck,
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
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [orderedLinks, setOrderedLinks] = useState(() => {
    const saved = localStorage.getItem("sidebarOrder");
    if (saved) {
      try {
        const paths = JSON.parse(saved);
        // Only include paths that exist in the master links safely
        return paths
          .map((to) => links.find((l) => l.to === to))
          .filter(Boolean);
      } catch (e) {
        return links;
      }
    }
    return links;
  });

  useEffect(() => {
    localStorage.setItem(
      "sidebarOrder",
      JSON.stringify(orderedLinks.map((l) => l.to))
    );
  }, [orderedLinks]);

  const resetOrder = () => {
    localStorage.removeItem("sidebarOrder");
    setOrderedLinks(links);
  };

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

      <Reorder.Group
        axis="y"
        values={orderedLinks}
        onReorder={setOrderedLinks}
        className="mt-4 space-y-2 list-none"
      >
        {orderedLinks.map((link) => (
          <SidebarItem key={link.to} link={link} collapsed={collapsed} />
        ))}
      </Reorder.Group>

      {/* Reset & Logout */}
      <div className="mt-auto p-4 space-y-2 border-t border-slate-200/60 dark:border-slate-800/60">
        {!collapsed && (
          <button
            onClick={resetOrder}
            className="flex items-center gap-3 w-full px-3 py-2 text-xs font-semibold text-slate-400 hover:text-brand dark:hover:text-white transition-colors group"
          >
            <RotateCcw className="h-3.5 w-3.5 group-hover:rotate-[-45deg] transition-transform" />
            Reset Order
          </button>
        )}

        {/* Admin Panel Link (only for admin/both users) */}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin/dashboard")}
            className={`relative flex items-center w-full ${
              collapsed ? "justify-center" : "gap-3 px-3"
            } py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all duration-200`}
            title={collapsed ? "Admin Panel" : undefined}
          >
            <ShieldCheck className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="truncate font-semibold"
              >
                Admin Panel
              </motion.span>
            )}
          </button>
        )}
        
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

function SidebarItem({ link, collapsed }) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={link}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{
        scale: 1.01,
        zIndex: 50,
      }}
      className="relative list-none px-3 select-none outline-none"
    >
      <div className="flex items-center group outline-none">
        {!collapsed && (
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="p-2 -ml-2 cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-brand dark:hover:text-white transition-colors flex-shrink-0"
            style={{ touchAction: "none" }}
          >
            <GripVertical size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        <NavLink
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) =>
            `relative flex items-center flex-1 ${
              collapsed ? "justify-center" : "gap-3"
            } rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none focus:outline-none focus:ring-0
            ${
              isActive
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`
          }
          title={collapsed ? link.label : undefined}
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

              <link.icon className="h-5 w-5 flex-shrink-0" />

              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="truncate"
                >
                  {link.label}
                </motion.span>
              )}
            </>
          )}
        </NavLink>
      </div>
    </Reorder.Item>
  );
}
