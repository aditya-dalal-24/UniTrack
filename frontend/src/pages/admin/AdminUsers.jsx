import { useState, useEffect, useMemo } from "react";
import { Search, ShieldCheck, UserCheck, UserX, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";


const ROLE_BADGE = {
  STUDENT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  ADMIN: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  BOTH: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  SUPER_ADMIN: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function AdminUsers() {
  const { userData } = useAuth();
  const isSuperAdmin = userData?.role === "SUPER_ADMIN";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await api.getAdminUsers();
    if (data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleActivate = async (id) => {
    setActionLoading(id);
    const { data, error } = await api.activateUser(id);
    if (error) alert(error);
    else setUsers((prev) => prev.map((u) => (u.id === id ? data : u)));
    setActionLoading(null);
  };

  const handleDeactivate = async (id) => {
    if (!confirm("Deactivate this user? They will not be able to login.")) return;
    setActionLoading(id);
    const { data, error } = await api.deactivateUser(id);
    if (error) alert(error);
    else setUsers((prev) => prev.map((u) => (u.id === id ? data : u)));
    setActionLoading(null);
  };

  const handleRoleChange = async (id, newRole) => {
    setActionLoading(id);
    const { data, error } = await api.changeUserRole(id, newRole);
    if (error) alert(error);
    else setUsers((prev) => prev.map((u) => (u.id === id ? data : u)));
    setActionLoading(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">User Management</h1>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-white/90 dark:bg-slate-900/80 shadow-soft border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 border-2 border-slate-300 border-t-brand rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-slate-500 dark:text-slate-400">
            <p className="text-sm font-medium">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Joined</th>
                  <th className="text-right px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                <AnimatePresence>
                  {filteredUsers.map((user) => {
                    const isSelf = user.email?.toLowerCase() === userData?.email?.toLowerCase();
                    const isSuper = user.role === "SUPER_ADMIN";

                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Name */}
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {user.name}
                            {isSuper && (
                              <span className="text-[10px] font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-1.5 py-0.5 rounded uppercase">
                                Super
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{user.email}</td>

                        {/* Role — inline dropdown for super admin */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isSuperAdmin && !isSuper ? (
                            <div className="relative inline-block">
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                disabled={actionLoading === user.id}
                                className={`appearance-none pr-7 pl-3 py-1 rounded-lg text-xs font-bold cursor-pointer border-0 outline-none transition-all ${ROLE_BADGE[user.role] || ROLE_BADGE.STUDENT}`}
                              >
                                <option value="STUDENT">STUDENT</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="BOTH">BOTH</option>
                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-60" />
                            </div>
                          ) : (
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${ROLE_BADGE[user.role] || ROLE_BADGE.STUDENT}`}>
                              {user.role}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(user.active ?? user.isActive) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                              <UserCheck className="h-3 w-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                              <UserX className="h-3 w-3" /> Inactive
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {isSuper ? (
                            <span className="text-xs text-slate-400 italic">Protected</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {(user.active ?? user.isActive) ? (
                                <button
                                  onClick={() => handleDeactivate(user.id)}
                                  disabled={actionLoading === user.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-all disabled:opacity-50"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivate(user.id)}
                                  disabled={actionLoading === user.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 transition-all disabled:opacity-50"
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User count footer */}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-right">
        Showing {filteredUsers.length} of {users.length} users
      </p>
    </motion.div>
  );
}
