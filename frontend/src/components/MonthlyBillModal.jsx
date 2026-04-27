import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  IndianRupee, 
  Calendar, 
  Calculator, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Tag
} from "lucide-react";

export default function MonthlyBillModal({ isOpen, onClose, onGenerate, categories = [] }) {
  const [rate, setRate] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    // Default to 1st of month 2 months ago
    const defaultDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return defaultDate.toISOString().split('T')[0];
  });
  
  // Find a default category (e.g. Hostel or Mess if they exist, or first available)
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      const defaultCat = categories.find(c => 
        c.name.toLowerCase().includes("hostel") || 
        c.name.toLowerCase().includes("mess") ||
        c.name.toLowerCase().includes("rent")
      ) || categories[0];
      setCategoryId(String(defaultCat.id));
    }
  }, [categories, categoryId]);

  const calculation = useMemo(() => {
    if (!rate || !startDate) return null;

    const monthlyRate = parseFloat(rate);
    if (isNaN(monthlyRate) || monthlyRate <= 0) return null;

    const start = new Date(startDate);
    const today = new Date();
    
    const months = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    while (current < firstOfCurrentMonth) {
      months.push({
        name: current.toLocaleString('default', { month: 'long', year: 'numeric' }),
        amount: monthlyRate
      });
      current.setMonth(current.getMonth() + 1);
    }

    const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    const ongoingAmount = (currentDay / daysInCurrentMonth) * monthlyRate;

    const total = (months.length * monthlyRate) + ongoingAmount;

    return {
      fullMonths: months,
      ongoingDays: currentDay,
      daysInMonth: daysInCurrentMonth,
      ongoingAmount: Math.round(ongoingAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }, [rate, startDate]);

  const handleGenerate = () => {
    if (!calculation || !categoryId) return;
    
    onGenerate({
      categoryId: parseInt(categoryId),
      amount: calculation.total,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      note: `Monthly Bill: ${calculation.fullMonths.length} full months + ${calculation.ongoingDays} days pro-rata.`
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Monthly Bill Generator</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Calculate pro-rated expenses automatically</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-8 space-y-6">
            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Monthly Rate (₹)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <IndianRupee className="h-4 w-4" />
                  </div>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Start Date</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Category</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Tag className="h-4 w-4" />
                  </div>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none dark:text-white appearance-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <AnimatePresence>
              {calculation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Breakdown</h4>
                    
                    <div className="space-y-3">
                      {calculation.fullMonths.map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span>{m.name}</span>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">₹{m.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <div className="h-4 w-4 rounded-full border-2 border-indigo-500/40 border-t-indigo-500 animate-spin" />
                          <span>Ongoing Month</span>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-slate-900 dark:text-white">₹{calculation.ongoingAmount.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-500">{calculation.ongoingDays}/{calculation.daysInMonth} days</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900 dark:text-white">Total Amount</span>
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{calculation.total.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                      This calculation follows the pro-rata logic: full months for completed periods and day-wise for the current month.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-4 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                disabled={!calculation || !categoryId}
                onClick={handleGenerate}
                className="flex-1 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Generate & Save
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
