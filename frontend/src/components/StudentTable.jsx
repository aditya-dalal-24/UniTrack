import { motion } from "framer-motion";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { cn } from "../utils/cn";

export default function StudentTable({ students }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Roll No</th>
              <th className="px-6 py-4">Class</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.map((student, index) => (
              <motion.tr
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {student.name}
                      </div>
                      <div className="text-xs text-slate-400">{student.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium">{student.rollNo}</td>
                <td className="px-6 py-4">{student.class}</td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      student.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}
                  >
                    {student.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand dark:hover:bg-slate-800 transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {students.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          No students found matching your criteria.
        </div>
      )}
    </div>
  );
}
