import { useState, useEffect } from "react";
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
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import useDarkMode from "../hooks/useDarkMode";
import { api } from "../services/api";

const defaultCategories = [
  { id: -1, name: "Food & Beverages", icon: Coffee, chartColor: "#64748b" },
  { id: -2, name: "Transportation", icon: Bus, chartColor: "#475569" },
  { id: -3, name: "Books & Stationery", icon: BookOpen, chartColor: "#334155" },
  { id: -4, name: "Shopping", icon: ShoppingBag, chartColor: "#1e293b" },
  { id: -5, name: "Entertainment", icon: MoreHorizontal, chartColor: "#0f172a" },
];

export default function Expenses() {
  const [isDark] = useDarkMode();
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

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

  const fetchExpensesAndCategories = async () => {
    setLoading(true);
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
    setLoading(false);
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
  const categoryBreakdown = categories.map((cat) => {
    const catExpenses = expenses.filter((exp) => {
      // Match by ID first, fallback to name
      if (cat.id && exp.categoryId) return exp.categoryId === cat.id;
      return exp.categoryName === cat.name;
    });
    const total = catExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
    return { ...cat, total, percentage, chartColor: cat.chartColor || '#64748b' };
  });

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

    const { error: apiError } = await api.addExpense({
      categoryId: categoryId,
      amount: parseFloat(newExpense.amount),
      note: newExpense.note,
      date: newExpense.date,
      time: newExpense.time,
    });

    if (apiError) {
      alert(apiError);
      return;
    }

    await fetchExpensesAndCategories();

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
    const { error: apiError } = await api.deleteExpense(id);
    if (apiError) {
      alert(apiError);
      return;
    }
    await fetchExpensesAndCategories();
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      alert("Please enter a category name");
      return;
    }

    const { error: apiError } = await api.addExpenseCategory({
      name: newCategoryName,
      color: "#64748b",
      icon: "Tag"
    });

    if (apiError) {
      alert(apiError);
      return;
    }

    await fetchExpensesAndCategories();
    setNewCategoryName("");
    setShowAddCategory(false);
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
    await fetchExpensesAndCategories();
  };

  const getCategoryIcon = (categoryName) => {
    const category = defaultCategories.find((cat) => cat.name === categoryName);
    if (category) {
      const Icon = category.icon;
      return <Icon className="h-5 w-5" />;
    }
    return <Tag className="h-5 w-5" />;
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              <Tag className="h-4 w-4" />
              Categories
            </button>
            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:bg-black dark:hover:bg-white transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </button>
          </div>
        }
      />

      {loading && <LoadingSpinner message="Loading expenses..." />}
      {error && <ErrorMessage message={error} onRetry={fetchExpensesAndCategories} />}

      {!loading && !error && (
        <>
          {/* Month Navigation */}
          <div className="flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-4 shadow-sm">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-brand" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {monthNames[selectedMonth]} {selectedYear}
              </h2>
            </div>
            <button
              onClick={goToNextMonth}
              disabled={selectedMonth === today.getMonth() && selectedYear === today.getFullYear()}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

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
                  
                  <div className="flex gap-4 mb-6">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name"
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-950/60 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none dark:text-white shadow-inner"
                    />
                    <button
                      onClick={handleAddCategory}
                      className="px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-700 transition-all font-medium flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`text-slate-500`}>
                            {getCategoryIcon(cat.name)}
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
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
                    ))}
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
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Category *
                      </label>
                      <select
                        value={newExpense.category}
                        onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                        className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-950/60 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none dark:text-white shadow-inner"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id || cat.name} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Amount *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <IndianRupee className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type="number"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                          placeholder="0.00"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-950/60 px-4 py-2.5 pl-8 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none dark:text-white shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                        className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-950/60 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none dark:text-white shadow-inner"
                      />
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={newExpense.note}
                        onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                        placeholder="Optional note"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-950/60 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none dark:text-white shadow-inner"
                      />
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 flex items-center justify-center">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Spent</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    ₹{totalExpenses.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Daily Average</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    ₹{averageExpense.toFixed(2).toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Transactions</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {expenses.length}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Highest Expense</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    ₹{highestExpense.toLocaleString()}
                  </p>
                </div>
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
                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={chartRenderer}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `₹${value}`}
                        contentStyle={{ 
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                        }}
                        itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 mb-6">
                  No data to display
                </div>
              )}

              <div className="space-y-4">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {getCategoryIcon(cat.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{cat.name}</p>
                        <p className="text-xs text-slate-500">{cat.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      ₹{cat.total.toLocaleString()}
                    </p>
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
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Recent Transactions
                </h3>
              </div>

              {expenses.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                  <Wallet className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No expenses recorded for this month</p>
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Add your first expense
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Note</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {expenses.sort((a,b) => {
                        const dateA = a.date ? new Date(`${a.date}T${a.time || "00:00:00"}`) : new Date(0);
                        const dateB = b.date ? new Date(`${b.date}T${b.time || "00:00:00"}`) : new Date(0);
                        return dateB - dateA;
                      }).map((exp, index) => {
                        // Safe date parsing
                        const expDate = exp.date ? new Date(`${exp.date}T${exp.time || "00:00:00"}`) : null;
                        const isValidDate = expDate && !isNaN(expDate.getTime());
                        return (
                        <tr
                          key={exp.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="text-slate-900 dark:text-slate-100 font-medium">
                              {isValidDate ? expDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {isValidDate ? expDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {getCategoryIcon(exp.categoryName || categories.find(c => String(c.id) === String(exp.categoryId))?.name)}
                              </div>
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {exp.categoryName || categories.find(c => String(c.id) === String(exp.categoryId))?.name || "Uncategorized"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                            {exp.note || "-"}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">
                            ₹{exp.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-white rounded-lg transition-colors inline-block"
                              title="Delete expense"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
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
    </div>
  );
}
