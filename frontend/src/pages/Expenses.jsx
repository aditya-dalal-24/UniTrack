import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  ShoppingBag,
  Coffee,
  Bus,
  BookOpen,
  MoreHorizontal,
  TrendingUp,
  Calendar,
  Plus,
  X,
  Trash2,
  Edit,
  Tag,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  FileText,
  Download,
  Printer,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Layers,
  Search,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import MonthlyExpenseReportModal from "../components/MonthlyExpenseReportModal";
import FloatingCalculator from "../components/FloatingCalculator";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { api } from "../services/api";

const defaultCategories = [
  { id: -1, name: "Food & Beverages", icon: Coffee, chartColor: "#16a34a" }, // green-600
  { id: -2, name: "Transportation", icon: Bus, chartColor: "#2563eb" }, // blue-600
  { id: -3, name: "Books & Stationery", icon: BookOpen, chartColor: "#ca8a04" }, // yellow-600
  { id: -4, name: "Shopping", icon: ShoppingBag, chartColor: "#dc2626" }, // red-600
  { id: -5, name: "Entertainment", icon: MoreHorizontal, chartColor: "#7c3aed" }, // violet-600
];

const rainbowColors = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
];

export default function Expenses() {
  const { isDark } = useAuth();
  const { invalidateDashboard } = useData();
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailyBill, setDailyBill] = useState(null);
  const [fetchingBill, setFetchingBill] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Month/Year tracking
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchExpensesAndCategories = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    const apiMonth = selectedMonth + 1; // backend expects 1-indexed month
    const [expensesResponse, categoriesResponse] = await Promise.all([
      api.getExpenses(apiMonth, selectedYear),
      api.getExpenseCategories()
    ]);

    if (expensesResponse.error) {
      setError(expensesResponse.error);
    } else if (categoriesResponse.error) {
      setError(categoriesResponse.error);
    } else {
      setExpenses(expensesResponse.data?.expenses || []);
      setCategories(categoriesResponse.data?.length > 0 ? categoriesResponse.data : defaultCategories);
    }
    if (showSpinner) setLoading(false);
  };

  useEffect(() => {
    fetchExpensesAndCategories();
  }, [selectedMonth, selectedYear]);

  // Form states
  const [newExpense, setNewExpense] = useState({
    category: "",
    amount: "",
    note: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
  });

  const [newCategoryName, setNewCategoryName] = useState("");

  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
  const highestExpense = expenses.length > 0 ? Math.max(...expenses.map((e) => e.amount || 0)) : 0;

  // Category breakdown for filtered expenses
  const categoryBreakdown = categories.map((cat, index) => {
    const catExpenses = expenses.filter((exp) => {
      // Match by ID first, fallback to name
      if (cat.id && exp.categoryId) return exp.categoryId === cat.id;
      return exp.categoryName === cat.name;
    });
    const total = catExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
    const chartColor = cat.chartColor || rainbowColors[index % rainbowColors.length];
    return { ...cat, total, percentage, chartColor };
  });

  const insights = useMemo(() => {
    if (expenses.length === 0) return [];
    const list = [];
    
    // Top category insight
    const topCat = [...categoryBreakdown].sort((a,b) => b.total - a.total)[0];
    if (topCat && topCat.total > 0) {
      list.push({
        text: `You're spending most on ${topCat.name}.`,
        icon: topCat.icon || Tag,
        color: topCat.chartColor
      });
    }

    // Milestone insight
    if (totalExpenses >= 500) {
      const milestone = Math.floor(totalExpenses / 500) * 500;
      list.push({
        text: `You have crossed ₹${milestone.toLocaleString()} for this month !`,
        icon: TrendingUp,
        color: "#ef4444" 
      });
    }

    // Number of transactions
    if (expenses.length > 10) {
      list.push({
        text: "You've been busy tracking this month!",
        icon: ShoppingBag,
        color: "#10b981"
      });
    }

    return list;
  }, [expenses, categoryBreakdown, totalExpenses]);

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleAddExpense = async () => {
    if (!String(newExpense.category).trim() || !newExpense.amount || parseFloat(newExpense.amount) <= 0) {
      alert("Please fill in a valid Category and Amount greater than 0");
      return;
    }

    let categoryId = parseInt(newExpense.category);

    // If the category is a default fallback category (negative ID), we must create it in the backend first
    if (categoryId < 0) {
      const defaultCat = defaultCategories.find(c => c.id === categoryId);
      if (defaultCat) {
        const { data: newCat, error: catError } = await api.addExpenseCategory(defaultCat.name);
        if (catError) {
          alert("Failed to auto-create category: " + catError);
          return;
        }
        if (newCat && newCat.id) {
          categoryId = newCat.id;
        }
      }
    }

    // Optimistic UI Update
    const tempId = Date.now();
    const selectedCategory = categories.find(c => c.id === categoryId);
    const optimisticExpense = {
      id: tempId,
      categoryId,
      categoryName: selectedCategory ? selectedCategory.name : "Other",
      amount: parseFloat(newExpense.amount),
      note: newExpense.note,
      date: newExpense.date,
      time: newExpense.time,
      isOptimistic: true // marker to prevent secondary interactions if needed
    };

    const prevExpenses = [...expenses];
    setExpenses(prev => [optimisticExpense, ...prev]);

    const { error: apiError } = await api.addExpense({
      categoryId: categoryId,
      amount: parseFloat(newExpense.amount),
      note: newExpense.note,
      date: newExpense.date,
      time: newExpense.time,
    });

    if (apiError) {
      setExpenses(prevExpenses); // Rollback
      alert(apiError);
      return;
    }

    await fetchExpensesAndCategories(false);
    invalidateDashboard();

    // Reset form
    setNewExpense({
      category: "",
      amount: "",
      note: "",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
    });
    setShowAddExpense(false);
  };

  const handleDeleteExpense = async (id) => {
    const prevExpenses = [...expenses];
    setExpenses(prev => prev.filter(e => e.id !== id)); // Optimistic UI

    const { error: apiError } = await api.deleteExpense(id);
    if (apiError) {
      setExpenses(prevExpenses); // Rollback
      alert(apiError);
      return;
    }
    await fetchExpensesAndCategories(false);
    invalidateDashboard();
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Please enter a category name");
      return;
    }

    const { error: apiError } = await api.addExpenseCategory(newCategoryName);

    if (apiError) {
      alert(apiError);
      return;
    }

    await fetchExpensesAndCategories(false);
    invalidateDashboard();
    setNewCategoryName("");
    setShowAddCategory(false);
  };

  const handleGenerateBill = async () => {
    setFetchingBill(true);
    const { data, error: billError } = await api.getExpenseBill(billDate);
    if (billError) {
      alert(billError);
    } else {
      setDailyBill(data);
    }
    setFetchingBill(false);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm(`Are you sure you want to delete this category?`)) {
      return;
    }
    
    const { error: apiError } = await api.deleteExpenseCategory(categoryId);
    if (apiError) {
      alert(apiError);
      return;
    }
    await fetchExpensesAndCategories(false);
    invalidateDashboard();
  };

  const getCategoryIcon = (categoryName) => {
    const category = defaultCategories.find((cat) => cat.name === categoryName);
    if (category) {
      const Icon = category.icon;
      return <Icon className="h-5 w-5" />;
    }
    return <Tag className="h-5 w-5" />;
  };

  const getCategoryColor = (categoryName) => {
    const cat = categoryBreakdown.find(c => c.name === categoryName);
    return cat ? cat.chartColor : "#64748b";
  };

  // Prepare data for pie chart
  const pieChartData = categoryBreakdown
    .filter((cat) => cat.total > 0)
    .map((cat) => ({
      name: cat.name,
      value: cat.total,
      color: cat.chartColor,
    }));

  const chartRenderer = (props) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return percent * 100 > 5 ? (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Tracker"
        description="Track your daily expenses and manage spending by category."
        actions={
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setShowBillModal(true)}
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-5 py-3 text-sm font-black shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <FileText className="h-4 w-4 text-emerald-500" />
              <span>Daily Bill</span>
            </button>
            <button
              onClick={() => setShowMonthlyReportModal(true)}
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-5 py-3 text-sm font-black shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Download className="h-4 w-4 text-blue-500" />
              <span>Monthly Report</span>
            </button>
            <button
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 px-5 py-3 text-sm font-black shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Layers className="h-4 w-4 text-orange-500" />
              <span>Categories</span>
            </button>
            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 text-sm font-black shadow-xl shadow-brand/20 dark:shadow-none transition-all hover:scale-105 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity" />
              <Plus className="h-5 w-5" />
              <span>Add Expense</span>
            </button>
          </div>
        }
      />

      {loading && <LoadingSpinner message="Loading expenses..." />}
      {error && <ErrorMessage message={error} onRetry={fetchExpensesAndCategories} />}

      {!loading && !error && (
        <>
          {/* Month Navigation */}
          {/* Month Navigation */}
          <div className="flex items-center justify-between rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-2 shadow-sm">
            <button
              onClick={goToPreviousMonth}
              className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all active:scale-90"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-4 px-6 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                {monthNames[selectedMonth]} {selectedYear}
              </h2>
            </div>
            <button
              onClick={goToNextMonth}
              disabled={selectedMonth === today.getMonth() && selectedYear === today.getFullYear()}
              className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Fun Insights Marquee */}
          {insights.length > 0 && (
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl py-3 shadow-sm">
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ 
                  duration: 24, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="flex gap-8 px-4 w-max"
              >
                {[...insights, ...insights, ...insights, ...insights].map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3"
                  >
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${insight.color}15`, color: insight.color }}>
                      <insight.icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {insight.text}
                    </p>
                    <span className="mx-4 text-slate-200 dark:text-slate-800">•</span>
                  </div>
                ))}
              </motion.div>
              {/* Fade gradients */}
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10" />
              <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10" />
            </div>
          )}

          <AnimatePresence>
            {showAddCategory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Manage Categories
                    </h3>
                    <button
                      onClick={() => setShowAddCategory(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name"
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-2.5 text-sm font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none dark:text-white shadow-inner"
                    />
                    <button
                      onClick={handleAddCategory}
                      className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all font-black text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {categories.map((cat) => {
                      const catColor = getCategoryColor(cat.name);
                      return (
                      <div 
                        key={cat.id} 
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 transition-all hover:shadow-sm"
                        style={{ borderColor: `${catColor}30` }}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div style={{ color: catColor }}>
                            {getCategoryIcon(cat.name)}
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                            {cat.name}
                          </span>
                        </div>
                        {cat.id && (
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-white rounded-lg transition-colors ml-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
            
            {showAddExpense && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Add New Expense
                    </h3>
                    <button
                      onClick={() => setShowAddExpense(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Category */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                        Classification
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-brand transition-colors">
                          <Tag className="h-4 w-4" />
                        </div>
                        <select
                          value={newExpense.category}
                          onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                          className="w-full appearance-none rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 pl-11 text-sm font-bold focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none dark:text-white shadow-inner"
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat.id || cat.name} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                        Magnitude
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-brand transition-colors">
                          <IndianRupee className="h-4 w-4" />
                        </div>
                        <input
                          type="number"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                          placeholder="0.00"
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 pl-11 text-sm font-black focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none dark:text-white shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                        Timeline
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-brand transition-colors">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                          className="w-full appearance-none rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 pl-11 text-sm font-bold focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none dark:text-white shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 ml-1">
                        Description
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-brand transition-colors">
                          <FileText className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          value={newExpense.note}
                          onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                          placeholder="What was this for?"
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 pl-11 text-sm font-bold focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none dark:text-white shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/60 mt-6">
                    <button
                      onClick={() => setShowAddExpense(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddExpense}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      Save Expense
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 transition-all hover:shadow-xl hover:shadow-emerald-500/10"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/5 transition-transform group-hover:scale-150" />
              <div className="relative flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Wallet className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Spent</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">₹</span>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-50">
                      {totalExpenses.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg w-fit">
                <TrendingUp size={12} /> {expenses.length} Trans. This Month
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 transition-all hover:shadow-xl hover:shadow-blue-500/10"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/5 transition-transform group-hover:scale-150" />
              <div className="relative flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Calculator className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Daily Average</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">₹</span>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-50">
                      {averageExpense.toFixed(0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg w-fit">
                <IndianRupee size={12} /> Optimized Spending
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 transition-all hover:shadow-xl hover:shadow-amber-500/10"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/5 transition-transform group-hover:scale-150" />
              <div className="relative flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Highest Bill</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">₹</span>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-50">
                      {highestExpense.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg w-fit">
                <Tag size={12} /> Biggest Purchase
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 transition-all hover:shadow-xl hover:shadow-indigo-500/10"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-500/5 transition-transform group-hover:scale-150" />
              <div className="relative flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <CreditCard className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Top Category</p>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-50 truncate max-w-[120px]">
                    {categoryBreakdown.some(c => c.total > 0) 
                      ? categoryBreakdown.sort((a,b) => b.total - a.total)[0]?.name 
                      : "None"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg w-fit">
                <Layers size={12} /> {Math.round(categoryBreakdown.sort((a,b) => b.total - a.total)[0]?.percentage || 0)}% of total
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-1 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60"
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">
                Spending Breakdown
              </h3>
              
              {pieChartData.length > 0 ? (
                <div className="h-64 mb-8 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `₹${value}`}
                        contentStyle={{ 
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                        }}
                        itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a', fontSize: '12px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">₹{totalExpenses.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 mb-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                  <Calculator className="h-10 w-10 mb-2 opacity-10" />
                  <p className="text-xs font-bold uppercase tracking-wider">No Data</p>
                </div>
              )}

              <div className="space-y-5">
                {categoryBreakdown.filter(c => c.total > 0).sort((a,b) => b.total - a.total).map((cat) => (
                  <div key={cat.name} className="group cursor-default">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: `${cat.chartColor}15`, color: cat.chartColor }}
                        >
                          {getCategoryIcon(cat.name)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200">{cat.name}</p>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">₹{cat.total.toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {cat.percentage.toFixed(0)}%
                      </p>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.percentage}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: cat.chartColor }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Transactions List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/20">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Recent Transactions
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search expenses..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-brand/10 transition-all dark:text-white" 
                  />
                </div>
              </div>
              {expenses.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="h-32 w-32 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand/10 to-transparent animate-pulse" />
                    <ShoppingBag className="h-12 w-12 text-slate-200 dark:text-slate-600 relative z-10" />
                  </motion.div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">No Spending Yet!</h4>
                  <p className="text-sm font-medium text-slate-400 max-w-[240px]">
                    Your wallet is happy, but our charts are lonely. Log your first expense to see your financial story unfold!
                  </p>
                  <button 
                    onClick={() => setShowAddExpense(true)}
                    className="mt-8 px-8 py-3.5 rounded-2xl bg-brand text-white text-sm font-black shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Log First Expense
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-10 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Classification</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Details</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Magnitude</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                      {expenses
                        .filter(e => 
                          e.note?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.categoryName?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .sort((a,b) => {
                          const dateA = a.date ? new Date(`${a.date}T${a.time || "00:00:00"}`) : new Date(0);
                          const dateB = b.date ? new Date(`${b.date}T${b.time || "00:00:00"}`) : new Date(0);
                          return dateB - dateA;
                        })
                        .map((expense, idx) => {
                          const catColor = getCategoryColor(expense.categoryName || categories.find(c => String(c.id) === String(expense.categoryId))?.name);
                          const expDate = expense.date ? new Date(`${expense.date}T${expense.time || "00:00:00"}`) : null;
                          const isValidDate = expDate && !isNaN(expDate.getTime());

                          return (
                            <motion.tr 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              key={expense.id} 
                              className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="px-6 py-5">
                                <div className="flex flex-col">
                                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                                    {isValidDate ? expDate.toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : "—"}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                                    {isValidDate ? expDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="h-10 w-10 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"
                                    style={{ backgroundColor: `${catColor}15`, color: catColor }}
                                  >
                                    {getCategoryIcon(expense.categoryName || categories.find(c => String(c.id) === String(expense.categoryId))?.name)}
                                  </div>
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {expense.categoryName || categories.find(c => String(c.id) === String(expense.categoryId))?.name || "Other"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-5 hidden md:table-cell">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 italic line-clamp-1">
                                  {expense.note ? `"${expense.note}"` : "No description"}
                                </p>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="text-sm font-black text-slate-900 dark:text-white">
                                    ₹{expense.amount?.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Spent</span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <button
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-90"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}

      {/* Daily Bill Modal */}
      <AnimatePresence>
        {showBillModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:fixed print:inset-0 print:bg-white print:z-50 print:block"
            onClick={() => { setShowBillModal(false); setDailyBill(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col print:shadow-none print:max-w-none print:h-auto print:rounded-none"
              onClick={(e) => e.stopPropagation()}
            >
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  .daily-bill-content {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
              ` }} />
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between print:hidden">
                <h3 className="text-xl font-bold">Daily Expense Bill</h3>
                <button onClick={() => { setShowBillModal(false); setDailyBill(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 print:hidden">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select Date</label>
                    <input 
                      type="date" 
                      value={billDate} 
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={handleGenerateBill}
                      disabled={fetchingBill}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                    >
                      {fetchingBill ? "Generating..." : "Generate"}
                    </button>
                  </div>
                </div>

                {dailyBill ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="daily-bill-content bg-white text-black rounded-2xl p-6 border-2 border-dashed border-slate-200 print:border-solid print:p-0 print:border-none relative"
                  >
                    {/* Receipt Header */}
                    <div className="text-center mb-6 border-b border-dashed border-slate-200 print:border-black pb-4">
                      <h4 className="text-2xl font-black tracking-tighter italic text-emerald-600 print:text-emerald-600">UNITRACK</h4>
                      <p className="text-[10px] text-black font-mono uppercase print:text-black">Electronic Expense Statement</p>
                      <div className="mt-4 flex justify-between text-[10px] font-mono text-slate-400 print:text-black px-2">
                        <span>DATE: {dailyBill.date}</span>
                        <span>REF: #{Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-3 mb-6 min-h-[100px]">
                      {dailyBill.expenses.map((exp, i) => (
                        <div key={i} className="flex justify-between items-start text-sm">
                          <div className="flex-1 pr-4">
                            <p className="font-bold print:font-extrabold" style={{ color: getCategoryColor(exp.categoryName || "Other") }}>
                              {exp.categoryName || "Other"}
                            </p>
                            {exp.note && <p className="text-[10px] text-slate-500 print:text-gray-800 italic">"{exp.note}"</p>}
                            <p className="text-[10px] text-slate-400 print:text-gray-800 font-mono">{exp.time || "00:00"}</p>
                          </div>
                          <p className="font-mono font-bold print:text-black">₹{exp.amount.toFixed(2)}</p>
                        </div>
                      ))}
                      {dailyBill.expenses.length === 0 && (
                        <p className="text-center text-slate-400 print:text-black text-sm py-8">No expenses found for this date.</p>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-800 print:border-black pt-4 mt-6">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-black font-bold uppercase">Total Items</span>
                        <span className="font-mono text-sm">{dailyBill.expenses.length}</span>
                      </div>
                      <div className="flex justify-between items-center bg-emerald-600/5 print:bg-emerald-50 print:border-t-2 print:border-black print:rounded-none p-3 rounded-xl mt-2">
                        <span className="text-lg font-black uppercase text-emerald-600 print:text-emerald-600">Grand Total</span>
                        <span className="text-xl font-mono font-black text-emerald-600 print:text-emerald-600">₹{dailyBill.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                      <div className="w-full h-8 bg-[url('https://www.scandit.com/wp-content/uploads/2021/11/barcode-hero.png')] bg-contain bg-center opacity-20 grayscale mb-2 print:hidden"></div>
                      <p className="text-[10px] text-slate-400 font-mono italic print:text-black">Thank you for tracking with UniTrack!</p>
                    </div>
                  </motion.div>
                ) : !fetchingBill && (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <Printer className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-xs font-medium">Select a date and click generate</p>
                  </div>
                )}
              </div>

              {dailyBill && (
                <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex gap-3 print:hidden">
                  <button 
                    onClick={() => window.print()} 
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-2xl text-sm font-bold hover:scale-[1.02] transition-all"
                  >
                    <Printer className="h-4 w-4" /> Print PDF
                  </button>
                  <button 
                    onClick={() => { setShowBillModal(false); setDailyBill(null); }}
                    className="px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-600 dark:text-slate-400"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MonthlyExpenseReportModal
        isOpen={showMonthlyReportModal}
        onClose={() => setShowMonthlyReportModal(false)}
      />

      <FloatingCalculator 
        isOpen={showCalculator} 
        onClose={() => setShowCalculator(false)} 
      />
    </div>
  );
}
