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
  Calendar,
  CheckSquare,
  LogOut,
  GripVertical,
  RotateCcw,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schedule", label: "Schedule", icon: CalendarCheck },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/marks", label: "Marks", icon: BarChart2 },
  { to: "/fees", label: "Fees", icon: ReceiptIndianRupee },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/profile", label: "Profile", icon: Users },
];

// Bottom nav shows a subset of the most important links
const bottomNavLinks = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/schedule", label: "Schedule", icon: CalendarCheck },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/marks", label: "Marks", icon: BarChart2 },
  { to: "/profile", label: "Profile", icon: Users },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [orderedLinks, setOrderedLinks] = useState(() => {
    const saved = localStorage.getItem("sidebarOrder");
    if (saved) {
      try {
        const paths = JSON.parse(saved);
        
        if (paths.includes("/attendance") || paths.includes("/timetable")) {
          return links;
        }

        const matchedLinks = paths
          .map((to) => links.find((l) => l.to === to))
          .filter(Boolean);
        const newLinks = links.filter((l) => !paths.includes(l.to));
        return [...matchedLinks, ...newLinks];
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

  // Close mobile sidebar when navigating
  const handleMobileNavClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* ===== MOBILE BOTTOM NAV BAR (visible on small screens only) ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/60 dark:border-slate-800/60 safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-1">
          {bottomNavLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-0 flex-1 ${
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <link.icon className={`h-5 w-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                    {isActive && (
                      <motion.div
                        layoutId="mobileActiveTab"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-slate-900 dark:bg-white"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium truncate ${isActive ? "font-bold" : ""}`}>
                    {link.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          {/* More button to open full sidebar overlay */}
          <button
            onClick={() => setMobileOpen && setMobileOpen(true)}
            className="flex flex-col items-center justify-center py-2 px-3 rounded-xl text-slate-400 dark:text-slate-500 min-w-0 flex-1"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] mt-1 font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* ===== MOBILE SIDEBAR OVERLAY (triggered by "More" button) ===== */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            {/* Slide-in panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed top-0 left-0 bottom-0 z-[70] w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-3">
                  <img src="/unitrack-logo.png" alt="Logo" className="h-9 w-9" />
                  <div>
                    <div className="text-xs font-semibold tracking-[0.25em] text-slate-400 border-l-2 border-brand pl-2 uppercase">
                      UNITRACK
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                      Student Hub
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Nav Links */}
              <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
                {orderedLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={handleMobileNavClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/80"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`
                    }
                  >
                    <link.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{link.label}</span>
                  </NavLink>
                ))}
              </nav>

              {/* Footer actions */}
              <div className="p-4 space-y-2 border-t border-slate-200/60 dark:border-slate-800/60">
                {isAdmin && (
                  <button
                    onClick={() => { navigate("/admin/dashboard"); handleMobileNavClick(); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                  >
                    <ShieldCheck className="h-5 w-5 flex-shrink-0" />
                    Admin Panel
                  </button>
                )}
                <button
                  onClick={() => { logout(); handleMobileNavClick(); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== DESKTOP SIDEBAR (hidden on mobile) ===== */}
      <aside
        className={`hidden md:flex relative z-20 h-screen flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur shadow-lg border-r border-slate-200/60 dark:border-slate-800/60 transition-all duration-300 flex-shrink-0 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          {collapsed ? (
            <img 
              src="/unitrack-logo.png" 
              alt="Logo" 
              className="h-8 w-8 mx-auto cursor-pointer" 
              onClick={() => navigate("/")}
            />
          ) : (
            <div className="flex items-center gap-3">
              <img 
                src="/unitrack-logo.png" 
                alt="Logo" 
                className="h-9 w-9" 
                onClick={() => navigate("/")}
              />
              <div>
                <div className="text-xs font-semibold tracking-[0.25em] text-slate-400 border-l-2 border-brand pl-2 uppercase">
                  UNITRACK
                </div>
                <div className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                  Student Hub
                </div>
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand hover:bg-slate-200 dark:hover:bg-slate-700 transition-all ml-auto"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="px-4 pb-2">
            <button
              onClick={() => setCollapsed(false)}
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

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
    </>
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
