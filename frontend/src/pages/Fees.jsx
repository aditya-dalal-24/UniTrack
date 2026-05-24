import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Building,
  Home,
  BookOpen,
  Plus,
  Download,
  AlertCircle,
  X,
  IndianRupee,
  FileText,
  Eye,
  Upload,
  Trash2,
  Pencil,
  CheckCircle,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { api } from "../services/api";
import { useData } from "../contexts/DataContext";
import { FEES_STATUS } from "../constants/enums";

import { recordAction, getSmartDefaults, getFeeSuggestions } from "../utils/behaviorEngine";

export default function Fees() {
  const { invalidateDashboard } = useData();
  const [selectedSemester, setSelectedSemester] = useState(() => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    return parseInt(userData.semester) || 1;
  });
  const [showAddFee, setShowAddFee] = useState(false);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [feesSummary, setFeesSummary] = useState(null);

  const handleImportPrevious = async () => {
    if (selectedSemester <= 1 || importing) return;
    setImporting(true);
    try {
      const { data: summary, error } = await api.getFees(selectedSemester - 1);
      if (error || !summary || !summary.fees || summary.fees.length === 0) {
        alert("No fees found in previous semester to import.");
        setImporting(false);
        return;
      }
      
      for (const fee of summary.fees) {
        await api.addFee({
          semester: selectedSemester,
          category: fee.category,
          totalAmount: fee.totalAmount,
          paidAmount: 0,
          dueDate: null,
          status: 'PENDING'
        });
      }
      fetchFees();
    } catch (e) {
      console.error(e);
    }
    setImporting(false);
  };

  const [newFee, setNewFee] = useState({
    category: "College",
    customCategory: "",
    amount: "",
    isPaid: false,
    dueDate: "",
    receiptData: null,
    receiptFileName: "",
  });

  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [editingFee, setEditingFee] = useState(null);

  const getCategoryIcon = (category) => {
    switch (category) {
      case "College": return <Building className="h-5 w-5" />;
      case "Hostel": return <Home className="h-5 w-5" />;
      case "Library": return <BookOpen className="h-5 w-5" />;
      default: return <CreditCard className="h-5 w-5" />;
    }
  };

  const fetchFees = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    const { data, error: apiError } = await api.getFees(selectedSemester);
    if (apiError) {
      setError(apiError);
    } else {
      setFeesSummary(data);
    }
    if (showSpinner) setLoading(false);
  };

  useEffect(() => {
    const loadData = async () => {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      if (!userData.semester) {
        const { data } = await api.getProfile();
        if (data && data.semester) {
          userData.semester = data.semester;
          localStorage.setItem("userData", JSON.stringify(userData));
          const profileSemester = parseInt(data.semester);
          if (selectedSemester !== profileSemester) {
            setSelectedSemester(profileSemester);
            return; // useEffect will re-run with the correct semester
          }
        }
      }
      fetchFees();
    };
    loadData();
  }, [selectedSemester]);

  // Handle command palette / navigation openAdd
  const location = useLocation();
  useEffect(() => {
    if (location.state?.openAdd) {
      const defaults = getSmartDefaults("fees", "add_fee");
      setNewFee(prev => ({ ...prev, ...defaults }));
      setShowAddFee(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.openAdd) setShowAddFee(true);
    };
    window.addEventListener("unitrack:command", handler);
    return () => window.removeEventListener("unitrack:command", handler);
  }, []);

  // Smart due-date warnings
  const urgentFees = useMemo(() => {
    if (!feesSummary?.fees) return [];
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return feesSummary.fees.filter(fee => {
      if (fee.status === FEES_STATUS.PAID) return false;
      if (!fee.dueDate) return false;
      const due = new Date(fee.dueDate);
      return due <= sevenDaysFromNow;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [feesSummary]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Max 2MB allowed.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewFee({
          ...newFee,
          receiptData: reader.result,
          receiptFileName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddFee = async () => {
    if (!newFee.amount || parseFloat(newFee.amount) <= 0 || !newFee.dueDate) {
      alert("Please enter a valid Amount greater than 0 and a Due Date.");
      return;
    }

    const totalAmount = parseFloat(newFee.amount);
    const paidAmount = newFee.isPaid ? totalAmount : 0;
    const status = newFee.isPaid ? FEES_STATUS.PAID : FEES_STATUS.PENDING;

    const payload = {
      semester: selectedSemester,
      category: newFee.category === "Other" ? newFee.customCategory : newFee.category,
      totalAmount,
      paidAmount,
      dueDate: newFee.dueDate,
      paidDate: newFee.isPaid ? new Date().toISOString().split('T')[0] : null,
      status,
      receiptData: newFee.receiptData,
      receiptFileName: newFee.receiptFileName,
    };

    const prevSummary = { ...feesSummary };
    const tempId = Date.now();
    const optimisticFee = {
      id: tempId,
      ...payload,
      pendingAmount: payload.totalAmount - payload.paidAmount,
      isOptimistic: true
    };

    setFeesSummary({
      ...(feesSummary || {}),
      fees: [...(feesSummary?.fees || []), optimisticFee],
    });

    const { error: apiError } = editingFee 
      ? await api.updateFee(editingFee.id, payload)
      : await api.addFee(payload);

    if (apiError) {
      setFeesSummary(prevSummary);
      alert(apiError);
      return;
    }

    recordAction("fees", "add_fee", { category: payload.category, amount: payload.totalAmount });

    await fetchFees(false);
    invalidateDashboard();
    setNewFee({ category: "College", customCategory: "", amount: "", isPaid: false, dueDate: "", receiptData: null, receiptFileName: "" });
    setShowAddFee(false);
    setShowReceiptUpload(false);
    setEditingFee(null);
  };

  const handleImportPreviousSem = async () => {
    if (selectedSemester <= 1) {
      alert("You are currently in Semester 1. No previous semester exists.");
      return;
    }
    if (!confirm(`Import recurring fees (College/Hostel/Library) from Semester ${selectedSemester - 1}?`)) return;
    
    setLoading(true);
    const { data: prevSemData, error } = await api.getFees(selectedSemester - 1);
    if (error || !prevSemData || !prevSemData.fees.length) {
      alert("No fees found in previous semester.");
      setLoading(false);
      return;
    }
    
    const recurringFees = prevSemData.fees.filter(f => ["College", "Hostel", "Library"].includes(f.category));
    if (recurringFees.length === 0) {
      alert("No core recurring fees found in the previous semester.");
      setLoading(false);
      return;
    }

    for (const fee of recurringFees) {
       const oldDate = new Date(fee.dueDate);
       const newDueDate = new Date(oldDate.setMonth(oldDate.getMonth() + 6)).toISOString().split('T')[0];
       
       await api.addFee({
         semester: selectedSemester,
         category: fee.category,
         totalAmount: fee.totalAmount,
         paidAmount: 0,
         dueDate: newDueDate,
         paidDate: null,
         status: FEES_STATUS.PENDING,
         receiptData: null,
         receiptFileName: null,
       });
    }
    
    await fetchFees(true);
    invalidateDashboard();
  };



  const handleEditInit = (fee) => {
    setEditingFee(fee);
    setNewFee({
      category: ["College", "Hostel", "Library"].includes(fee.category) ? fee.category : "Other",
      customCategory: ["College", "Hostel", "Library"].includes(fee.category) ? "" : fee.category,
      amount: fee.totalAmount.toString(),
      isPaid: fee.status === FEES_STATUS.PAID,
      dueDate: fee.dueDate,
      receiptData: fee.receiptData,
      receiptFileName: fee.receiptFileName || ""
    });
    setShowAddFee(true);
  };

  const handleDeleteFee = async (id) => {
    if (!confirm("Delete this fee record?")) return;
    
    const prevSummary = { ...feesSummary };
    setFeesSummary({
      ...feesSummary,
      fees: feesSummary.fees.filter(f => f.id !== id)
    });

    const { error } = await api.deleteFee(id);
    if (error) {
      setFeesSummary(prevSummary);
      alert(error);
    } else {
      fetchFees(false);
      invalidateDashboard();
    }
  };

  const handleToggleFeeStatus = async (fee) => {
    const isPaid = fee.status === FEES_STATUS.PAID;
    const payload = {
      ...fee,
      paidAmount: isPaid ? 0 : fee.totalAmount,
      status: isPaid ? FEES_STATUS.PENDING : FEES_STATUS.PAID,
      paidDate: isPaid ? null : new Date().toISOString().split('T')[0]
    };

    const { error } = await api.updateFee(fee.id, payload);
    if (error) {
      alert(error);
    } else {
      await fetchFees(false);
      invalidateDashboard();
    }
  };

  const totalFees = feesSummary?.totalFees || 0;
  const totalPaid = feesSummary?.totalPaid || 0;
  const totalPending = feesSummary?.totalPending || 0;
  const currentSemesterFees = [...(feesSummary?.fees || [])].sort((a, b) => a.id - b.id);

  return (
    <div className="space-y-8 pb-12 font-sans">
      <PageHeader
        title="Financial Hub"
        description="Monitor your academic investments and payment statuses."
        actions={
          <div className="flex gap-2">
            {selectedSemester > 1 && (
               <button
                 onClick={handleImportPreviousSem}
                 className="group relative inline-flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3 text-sm font-black shadow-sm transition-all hover:scale-105 active:scale-95 overflow-hidden border border-slate-200 dark:border-slate-700"
               >
                 <Download className="h-5 w-5" />
                 <span>Import Last Sem</span>
               </button>
            )}
            <button
              onClick={() => {
                const defaults = getSmartDefaults("fees", "add_fee");
                setNewFee(prev => ({ ...prev, ...defaults }));
                setShowAddFee(true);
              }}
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-brand text-white px-6 py-3 text-sm font-black shadow-xl shadow-brand/20 transition-all hover:scale-105 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="h-5 w-5" />
              <span>New Fee Record</span>
            </button>
          </div>
        }
      />



      {loading && <LoadingSpinner message="Accessing Financial Core..." />}
      {error && <ErrorMessage message={error} onRetry={fetchFees} />}

      {!loading && !error && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Obligation", value: totalFees, icon: CreditCard, color: "indigo", delay: 0 },
              { label: "Settled Amount", value: totalPaid, icon: IndianRupee, color: "emerald", delay: 0.1 },
              { label: "Pending Balance", value: totalPending, icon: AlertCircle, color: "rose", delay: 0.2 },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: stat.delay }}
                className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 transition-all hover:shadow-2xl"
              >
                <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20 group-hover:opacity-30 transition-all group-hover:scale-150
                  ${stat.color === 'indigo' ? 'bg-indigo-400' : ''}
                  ${stat.color === 'emerald' ? 'bg-emerald-400' : ''}
                  ${stat.color === 'rose' ? 'bg-rose-400' : ''}
                `} />
                <div className="relative flex items-center gap-4">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 border border-transparent
                    ${stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/20' : ''}
                    ${stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20' : ''}
                    ${stat.color === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/20' : ''}
                  `}>
                    <stat.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{stat.label}</p>
                    <p className={`text-2xl font-black 
                      ${stat.color === 'emerald' ? 'text-emerald-600' : 
                        stat.color === 'rose' ? 'text-rose-600' : 
                        stat.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : 
                        'text-slate-900 dark:text-white'}
                    `}>
                      ₹{stat.value.toLocaleString()}
                    </p>
                  </div>
                </div>
                {stat.label === "Settled Amount" && totalFees > 0 && (
                  <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (totalPaid/totalFees)*100)}%` }}
                      className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                )}
              </motion.div>
            ))}

            {/* COMPACT MONOCHROME Active Timeline Selector */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900/80 backdrop-blur-sm p-4 shadow-sm border border-slate-200/60 dark:border-slate-700 transition-all hover:shadow-2xl flex flex-col justify-center"
            >
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-5 bg-slate-400 dark:bg-white group-hover:scale-150 transition-all group-hover:opacity-10" />
              <div className="flex justify-between items-center mb-3 px-1">
                <p className="text-[12px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Timeline Bar</p>
                <p className="text-[10px] font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">SEM {selectedSemester}</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5 relative">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemester(sem)}
                    className={`h-7 rounded-lg text-[10px] font-black transition-all ${
                      selectedSemester === sem
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-105"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-400 border border-transparent dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    S{sem}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Predictive Insights Panel */}
          {urgentFees.length > 0 && (
            <div className="rounded-[30px] border border-brand/20 dark:border-brand-500/20 bg-brand/5 dark:bg-brand-500/5 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/10 dark:bg-white/10 blur-2xl" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <AlertCircle className="h-5 w-5 text-brand dark:text-white" />
                <h4 className="text-sm font-black text-brand dark:text-white uppercase tracking-tight">Predictive Insights</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                {urgentFees.map((fee, idx) => {
                  const due = new Date(fee.dueDate);
                  const now = new Date();
                  const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysLeft < 0;
                  
                  return (
                    <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border ${isOverdue ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'}`}>
                      <div className={`p-2 rounded-xl ${isOverdue ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                        {getCategoryIcon(fee.category)}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {fee.category} Fee is {isOverdue ? 'overdue by ' + Math.abs(daysLeft) + ' days' : 'due in ' + daysLeft + ' days'}.
                        </p>
                        <p className="text-xs font-black text-slate-500 mt-1">₹{fee.totalAmount?.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <AnimatePresence>
            {showAddFee && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"
              >
                <div className="rounded-[40px] bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/60 dark:border-slate-800/60 p-10 overflow-hidden relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-10 relative">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {editingFee ? 'Edit Entry' : 'Initialize Record'}
                      </h3>
                      <p className="text-sm font-bold text-slate-400">
                        {editingFee ? 'Updating existing financial node.' : 'Input your transaction details to the ledger.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddFee(false);
                        setEditingFee(null);
                      }}
                      className="p-4 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Classification</label>
                      <select
                        value={newFee.category}
                        onChange={(e) => setNewFee({ ...newFee, category: e.target.value })}
                        className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 py-3 text-sm font-bold focus:border-brand focus:ring-0 transition-all dark:text-white"
                      >
                        <option value="College">Academic Tuition</option>
                        <option value="Hostel">Residency/Hostel</option>
                        <option value="Library">Resource/Library</option>
                        <option value="Other">Miscellaneous</option>
                      </select>
                    </div>

                    {newFee.category === "Other" && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Descriptor</label>
                        <input
                          type="text"
                          value={newFee.customCategory}
                          onChange={(e) => setNewFee({ ...newFee, customCategory: e.target.value })}
                          placeholder="Ex: Exam Portal"
                          className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 py-3 text-sm font-bold focus:border-brand focus:ring-0 transition-all dark:text-white"
                        />
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Quota (Total)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">₹</span>
                        <input
                          type="number"
                          value={newFee.amount}
                          onChange={(e) => setNewFee({ ...newFee, amount: e.target.value })}
                          className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-8 pr-5 py-3 text-sm font-bold focus:border-brand transition-all dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Payment Status</label>
                      <button
                        onClick={() => setNewFee({ ...newFee, isPaid: !newFee.isPaid })}
                        className={`w-full h-[48px] rounded-2xl border-2 transition-all flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest ${
                          newFee.isPaid 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        {newFee.isPaid ? 'Fully Paid' : 'Mark as Paid'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Deadline</label>
                      <input
                        type="date"
                        value={newFee.dueDate}
                        onChange={(e) => setNewFee({ ...newFee, dueDate: e.target.value })}
                        className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 py-3 text-sm font-bold focus:border-brand transition-all dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      {!showReceiptUpload && !newFee.receiptFileName ? (
                        <button
                          onClick={() => setShowReceiptUpload(true)}
                          className="w-full h-[48px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-brand hover:border-brand/30 transition-all bg-slate-50/30 dark:bg-slate-900/30"
                        >
                          <Plus className="h-4 w-4" /> Add Receipt (Optional)
                        </button>
                      ) : (
                        <>
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 flex justify-between">
                            Digital Receipt
                            <button onClick={() => { setShowReceiptUpload(false); setNewFee(prev => ({...prev, receiptData: null, receiptFileName: ""}))}} className="text-rose-400 hover:text-rose-500">Remove</button>
                          </label>
                          <div className="relative group">
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={handleFileChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`w-full h-[48px] rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${newFee.receiptFileName ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-800 hover:border-brand/50 bg-slate-50/30'}`}>
                              {newFee.receiptFileName ? (
                                <>
                                  <FileText className="h-5 w-5 text-emerald-500" />
                                  <span className="text-xs font-black text-emerald-600 truncate max-w-[200px]">{newFee.receiptFileName}</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-5 w-5 text-slate-400 group-hover:text-brand transition-colors" />
                                  <span className="text-xs font-bold text-slate-400 group-hover:text-brand transition-colors">Select or drop file</span>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 mt-12 relative">
                    <button
                      onClick={() => {
                        setShowAddFee(false);
                        setEditingFee(null);
                      }}
                      className="px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      Abort
                    </button>
                    <button
                      onClick={handleAddFee}
                      className="px-10 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                    >
                      {editingFee ? 'Update Record' : 'Commit Record'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-8">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <div className="h-3 w-12 bg-slate-900 dark:bg-white rounded-full" />
                <h3 className="text-base font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                  Sem-0{selectedSemester} Financial Ledger
                </h3>
              </div>
            </div>

            {currentSemesterFees.length === 0 ? (
              <div className="rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 p-24 text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="h-24 w-24 rounded-[32px] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <CreditCard className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">No Records Detected</h4>
                <p className="text-sm font-bold text-slate-400 mb-8 max-w-xs mx-auto text-balance">This financial node is currently empty for the selected semester timeline.</p>
                <div className="flex flex-col items-center justify-center gap-3">
                  <button
                    onClick={() => setShowAddFee(true)}
                    className="px-8 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                  >
                    Initiate first entry
                  </button>
                  {selectedSemester > 1 && (
                    <button
                      onClick={handleImportPrevious}
                      disabled={importing}
                      className="px-8 py-3 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {importing ? "Importing..." : "Auto-Import Previous Semester"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {currentSemesterFees.map((fee, index) => {
                  const pending = fee.pendingAmount;
                  const statusColors = {
                    [FEES_STATUS.PAID]: "bg-emerald-500",
                    [FEES_STATUS.PARTIAL]: "bg-amber-500",
                    [FEES_STATUS.PENDING]: "bg-rose-500",
                  };
                  
                  return (
                    <motion.div
                      key={fee.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`group relative rounded-[35px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 transition-all hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] dark:hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] hover:-translate-y-2 overflow-hidden`}
                    >
                      <div className={`absolute top-0 right-0 h-1.5 w-32 rounded-bl-3xl ${statusColors[fee.status] || 'bg-slate-500'}`} />
                      
                      <div className="flex items-start justify-between mb-8 relative">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 shadow-sm transition-transform group-hover:scale-110">
                            {getCategoryIcon(fee.category)}
                          </div>
                          <div>
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{fee.category} <span className="text-slate-400 ml-1">₹{fee.totalAmount.toLocaleString()}</span></h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className={`h-1.5 w-1.5 rounded-full ${statusColors[fee.status] || 'bg-slate-500'}`} />
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                {fee.status === FEES_STATUS.PAID ? 'Settled' : 'Unpaid'} Node
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                          <p className="text-xs font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg">
                            {new Date(fee.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleFeeStatus(fee)}
                        className={`w-full py-6 rounded-[24px] flex items-center justify-center transition-all mb-6 border-2 group ${
                          fee.status === FEES_STATUS.PAID 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/20' 
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-brand/50 hover:text-brand'
                        }`}
                      >
                        {fee.status === FEES_STATUS.PAID ? (
                           <CheckCircle className="w-12 h-12 scale-110" />
                        ) : (
                           <div className="flex flex-col items-center gap-2">
                             <CheckCircle className="w-8 h-8 opacity-50 group-hover:scale-110 transition-transform" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Mark as Paid</span>
                           </div>
                        )}
                      </button>
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleEditInit(fee)}
                            className="flex flex-col items-center justify-center gap-1 p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm"
                            title="Edit Record"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Modify</span>
                          </button>
                          
                          <button
                            onClick={() => setViewingReceipt(fee)}
                            disabled={!fee.receiptData}
                            className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl border transition-all shadow-sm ${
                              fee.receiptData 
                                ? 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700' 
                                : 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed opacity-50'
                            }`}
                            title={fee.receiptData ? "View Digital Proof" : "No Proof Available"}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Proof</span>
                          </button>

                          <button
                            onClick={() => handleDeleteFee(fee.id)}
                            className="flex flex-col items-center justify-center gap-1 p-2.5 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-2xl border border-rose-100 dark:border-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all shadow-sm"
                            title="Delete Record"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Erase</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>


          <AnimatePresence>
            {viewingReceipt && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
                onClick={() => setViewingReceipt(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{viewingReceipt.category} Transaction</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewingReceipt.receiptFileName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <a 
                        href={viewingReceipt.receiptData} 
                        download={viewingReceipt.receiptFileName}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 hover:text-brand transition-all"
                      >
                        <Download className="h-5 w-5" />
                      </a>
                      <button 
                        onClick={() => setViewingReceipt(null)}
                        className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 transition-all"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-10 flex items-center justify-center">
                    {viewingReceipt.receiptData.startsWith('data:application/pdf') ? (
                      <iframe src={viewingReceipt.receiptData} className="w-full h-full min-h-[60vh] rounded-[32px] shadow-2xl" title="Receipt" />
                    ) : (
                      <img src={viewingReceipt.receiptData} alt="Receipt" className="max-w-full h-auto rounded-[32px] shadow-2xl border border-white/10" />
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
