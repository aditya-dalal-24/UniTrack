import { useState, useEffect } from "react";
import { Users, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../../services/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { data } = await api.getAdminStats();
      if (data) setStats(data);
      setLoading(false);
    }
    fetchStats();
  }, []);

  const cards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? "—",
      icon: Users,
      accent: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    },
    {
      label: "Total Admins",
      value: stats?.totalAdmins ?? "—",
      icon: ShieldCheck,
      accent: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    },
    {
      label: "Active Users",
      value: stats?.activeUsers ?? "—",
      icon: UserCheck,
      accent: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Inactive Users",
      value: stats?.inactiveUsers ?? "—",
      icon: UserX,
      accent: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border p-6 hover:-translate-y-1 hover:shadow-lg transition-all"
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
    </motion.div>
  );
}
