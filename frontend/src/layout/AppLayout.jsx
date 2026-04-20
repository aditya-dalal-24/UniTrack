import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";

export default function AppLayout() {
  const { isDark } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-black overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300 overflow-y-auto">
        <Topbar />
        {/* pb-20 on mobile to avoid content being hidden behind the bottom nav bar */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 w-full flex flex-col gap-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
