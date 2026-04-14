import { useState, useEffect } from "react";
import { Users, ShieldCheck, UserCheck, UserX, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { api } from "../../services/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const [statsRes, usersRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers()
      ]);
      
      if (statsRes.data) setStats(statsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const getAggregatedSuperAdmins = () => {
    return users.filter(u => u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.role === "BOTH").length;
  };

  const getActiveUsers = () => users.filter(u => u.active ?? u.isActive).length;
  const getInactiveUsers = () => users.filter(u => !(u.active ?? u.isActive)).length;

  const cards = [
    {
      id: "totalUsers",
      label: "Total Users",
      value: stats?.totalUsers ?? users.length ?? "—",
      icon: Users,
      accent: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
      filterFn: () => true
    },
    {
      id: "superAdmins",
      label: "Super Admins",
      value: stats?.totalSuperAdmins ?? getAggregatedSuperAdmins(),
      icon: ShieldCheck,
      accent: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
      filterFn: (u) => u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.role === "BOTH"
    },
    {
      id: "admins",
      label: "Total Admins",
      value: stats?.totalAdmins ?? users.filter(u => u.role === "ADMIN" || u.role === "BOTH").length,
      icon: ShieldCheck,
      accent: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
      filterFn: (u) => u.role === "ADMIN" || u.role === "BOTH"
    },
    {
      id: "active",
      label: "Active Users",
      value: stats?.activeUsers ?? getActiveUsers(),
      icon: UserCheck,
      accent: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
      filterFn: (u) => (u.active ?? u.isActive) === true
    },
    {
      id: "inactive",
      label: "Inactive Users",
      value: stats?.inactiveUsers ?? getInactiveUsers(),
      icon: UserX,
      accent: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
      filterFn: (u) => (u.active ?? u.isActive) === false
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-2 border-slate-300 border-t-brand rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.id}
              onClick={() => setExpandedCard(card)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="cursor-pointer rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border border-slate-200/60 dark:border-slate-800/60 p-6 hover:-translate-y-1 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${card.accent}`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{card.label}</p>
              <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{card.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Full Screen Modal Overlay via Portal */}
      {expandedCard && createPortal(
        <AnimatePresence>
          {(() => {
          const filteredUsers = users.filter(expandedCard.filterFn);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedCard(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${expandedCard.accent}`}>
                      <expandedCard.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{expandedCard.label}</h2>
                      <p className="text-sm text-slate-500">{filteredUsers.length} Users found</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedCard(null)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal Body / User List */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                  {filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <Users className="h-12 w-12 mb-4 opacity-20" />
                      <p>No users found in this category.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredUsers.map((u) => (
                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors gap-3 border border-slate-100 dark:border-slate-700/50">
                          <div>
                            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                              {u.name}
                            </p>
                            <p className="text-sm text-slate-500">{u.email}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                              (u.active ?? u.isActive) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                            }`}>
                              {(u.active ?? u.isActive) ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              {u.role.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>,
      document.body
    )}
    </motion.div>
  );
}
