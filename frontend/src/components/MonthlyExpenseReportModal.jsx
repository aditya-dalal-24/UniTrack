import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Printer, 
  FileText, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Download
} from "lucide-react";
import { api } from "../services/api";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MonthlyExpenseReportModal({ isOpen, onClose }) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    const { data, error } = await api.getMonthlyExpenseBill(selectedMonth + 1, selectedYear);
    if (error) {
      alert(error);
    } else {
      setReportData(data);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:z-[9999]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 print:hidden"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:h-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Monthly Expense Report</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Controls */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-end print:hidden">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {monthNames.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {[today.getFullYear(), today.getFullYear() - 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {loading ? "Fetching..." : "Generate"}
            </button>
          </div>

          {/* Report Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-slate-900/50 print:p-0 print:overflow-visible">
            {reportData ? (
              <div className="report-content bg-white text-black rounded-3xl p-8 border-2 border-dashed border-slate-300 shadow-sm print:border-none print:p-0 print:shadow-none">
                {/* PDF Header */}
                <div className="text-center mb-10 border-b border-dashed border-slate-400 pb-6">
                  <h4 className="text-3xl font-black tracking-tighter italic text-blue-600">UNITRACK</h4>
                  <p className="text-xs text-black font-mono uppercase tracking-[0.2em] mt-1">Monthly Expense Report</p>
                  <div className="mt-6 flex justify-between text-xs font-mono text-black font-bold">
                    <span>MONTH: {reportData.month} {reportData.year}</span>
                    <span>GENERATED: {new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 text-black">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-blue-600">Total Spent</p>
                    <p className="text-2xl font-mono font-black tracking-tight">₹{reportData.totalSpent.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-blue-600">Daily Average</p>
                    <p className="text-2xl font-mono font-black tracking-tight">₹{reportData.averageDailySpend.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-blue-600">Highest Day</p>
                    <p className="text-2xl font-mono font-black tracking-tight">₹{reportData.highestExpenseAmount.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-blue-600">Highest Date</p>
                    <p className="text-lg font-black">{reportData.highestExpenseDay || "—"}</p>
                  </div>
                </div>

                {/* Day-wise Breakdown */}
                <div className="space-y-8">
                  <h5 className="text-xs font-black uppercase tracking-widest text-blue-600 border-b-2 border-blue-100 dark:border-blue-900/30 pb-2 mb-4">Detailed Breakdown</h5>
                  
                  {reportData.dailyGroups.map((group, idx) => (
                    <div key={idx} className="space-y-4 pt-4 first:pt-0 text-black">
                      <div className="flex justify-between items-end border-b-2 border-slate-100 pb-2">
                        <div className="flex items-baseline gap-3">
                          <span className="text-lg font-black font-mono">{group.date}</span>
                          <span className="text-xs uppercase font-black opacity-50">{group.dayOfWeek}</span>
                        </div>
                        <span className="text-sm font-black text-blue-600">TOTAL: ₹{group.dailyTotal.toLocaleString()}</span>
                      </div>
                      
                      <div className="pl-4 space-y-3">
                        {group.expenses.map((exp, eIdx) => (
                          <div key={eIdx} className="flex justify-between items-start text-sm">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-black">{exp.categoryName || "Other"}</span>
                                {exp.time && <span className="text-xs font-mono font-bold opacity-40">{exp.time}</span>}
                              </div>
                              {exp.note && <p className="text-xs italic mt-1 font-medium opacity-60">"{exp.note}"</p>}
                            </div>
                            <span className="font-mono font-black text-base">₹{exp.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {reportData.dailyGroups.length === 0 && (
                    <div className="py-20 text-center space-y-3">
                      <AlertCircle className="h-10 w-10 text-slate-200 mx-auto" />
                      <p className="text-sm text-slate-400 font-medium">No expenses recorded for this month.</p>
                    </div>
                  )}
                </div>

                {/* Grand Total Section */}
                <div className="mt-10 border-t-2 border-dashed border-slate-200 pt-6">
                  <div className="flex justify-between items-center bg-blue-50 p-6 rounded-2xl">
                    <div>
                      <p className="text-xs font-black uppercase text-blue-600 tracking-wider mb-1">Grand Total</p>
                      <p className="text-[13px] text-slate-500 font-mono italic">Total amount spent for {reportData.month} {reportData.year}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black text-blue-600 font-mono tracking-tighter">₹{reportData.totalSpent.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* New Footer */}
                <div className="mt-12 pt-6 border-t border-slate-100 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Generated by UniTrack</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 py-20">
                <FileText className="h-16 w-16 opacity-10" />
                <p className="text-sm font-medium opacity-40">Select a month and click Generate</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex gap-3 print:hidden">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 transition-all"
            >
              Close
            </button>
            <button
              disabled={!reportData}
              onClick={handlePrint}
              className="flex-2 px-8 py-3 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
