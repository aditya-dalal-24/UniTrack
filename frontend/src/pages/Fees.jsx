import { useState, useEffect } from "react";
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
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { api } from "../services/api";
import { useData } from "../contexts/DataContext";
import { FEES_STATUS } from "../constants/enums";

export default function Fees() {
  const { invalidateDashboard } = useData();
  const [selectedSemester, setSelectedSemester] = useState(() => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    return parseInt(userData.semester) || 1;
  });
  const [showAddFee, setShowAddFee] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feesSummary, setFeesSummary] = useState(null);

  const [newFee, setNewFee] = useState({
    category: "College",
    customCategory: "",
    amount: "",
    paid: "",
    dueDate: "",
    receiptData: null,
    receiptFileName: "",
  });

  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [settlingFee, setSettlingFee] = useState(null);
  const [editingFee, setEditingFee] = useState(null);
  const [settleAmount, setSettleAmount] = useState("");

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
    const paidAmount = parseFloat(newFee.paid) || 0;
    let status = FEES_STATUS.PENDING;
    if (paidAmount >= totalAmount) {
      status = FEES_STATUS.PAID;
    } else if (paidAmount > 0) {
      status = FEES_STATUS.PARTIAL;
    }

    const payload = {
      semester: selectedSemester,
      category: newFee.category === "Other" ? newFee.customCategory : newFee.category,
      totalAmount,
      paidAmount,
      dueDate: newFee.dueDate,
      paidDate: paidAmount > 0 ? new Date().toISOString().split('T')[0] : null,
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

    await fetchFees(false);
    invalidateDashboard();
    setNewFee({ category: "College", customCategory: "", amount: "", paid: "", dueDate: "", receiptData: null, receiptFileName: "" });
    setShowAddFee(false);
    setEditingFee(null);
  };

  const handleEditInit = (fee) => {
    setEditingFee(fee);
    setNewFee({
      category: ["College", "Hostel", "Library"].includes(fee.category) ? fee.category : "Other",
      customCategory: ["College", "Hostel", "Library"].includes(fee.category) ? "" : fee.category,
      amount: fee.totalAmount.toString(),
      paid: fee.paidAmount.toString(),
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

  const handleSettleFee = async () => {
    if (!settleAmount || parseFloat(settleAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const amount = parseFloat(settleAmount);
    const newPaidAmount = settlingFee.paidAmount + amount;
    
    let status = FEES_STATUS.PARTIAL;
    if (newPaidAmount >= settlingFee.totalAmount) {
      status = FEES_STATUS.PAID;
    }

    const payload = {
      ...settlingFee,
      paidAmount: newPaidAmount,
      status,
      paidDate: new Date().toISOString().split('T')[0]
    };

    const { error } = await api.updateFee(settlingFee.id, payload);
    if (error) {
      alert(error);
    } else {
      fetchFees(false);
      invalidateDashboard();
      setSettlingFee(null);
      setSettleAmount("");
    }
  };

  const totalFees = feesSummary?.totalFees || 0;
  const totalPaid = feesSummary?.totalPaid || 0;
  const totalPending = feesSummary?.totalPending || 0;
  const currentSemesterFees = feesSummary?.fees || [];

  return (
    <div className="space-y-8 pb-12 font-sans">
      <PageHeader
        title="Financial Hub"
        description="Monitor your academic investments and payment statuses."
        actions={
          <button
            onClick={() => setShowAddFee(true)}
            className="group relative inline-flex items-center gap-2 rounded-2xl bg-brand text-white px-6 py-3 text-sm font-black shadow-xl shadow-brand/20 transition-all hover:scale-105 active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Plus className="h-5 w-5" />
            <span>New Transaction</span>
          </button>
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Classification</label>
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Descriptor</label>
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Quota (Total)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={newFee.amount}
                          onChange={(e) => setNewFee({ ...newFee, amount: e.target.value })}
                          className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-8 pr-5 py-3 text-sm font-bold focus:border-brand transition-all dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Processed</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={newFee.paid}
                          onChange={(e) => setNewFee({ ...newFee, paid: e.target.value })}
                          className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-8 pr-5 py-3 text-sm font-bold focus:border-brand transition-all dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Deadline</label>
                      <input
                        type="date"
                        value={newFee.dueDate}
                        onChange={(e) => setNewFee({ ...newFee, dueDate: e.target.value })}
                        className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-5 py-3 text-sm font-bold focus:border-brand transition-all dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Digital Receipt</label>
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
                              <Upload className="h-5 w-5 text-slate-400" />
                              <span className="text-xs font-bold text-slate-400">Click to link digital proof</span>
                            </>
                          )}
                        </div>
                      </div>
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
                <button
                  onClick={() => setShowAddFee(true)}
                  className="px-8 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                >
                  Initiate first entry
                </button>
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
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{fee.category}</h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className={`h-1.5 w-1.5 rounded-full ${statusColors[fee.status]}`} />
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                {fee.status} Node
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

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50/80 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Target Quota</p>
                          <p className="text-lg font-black text-slate-900 dark:text-white">₹{fee.totalAmount.toLocaleString()}</p>
                        </div>
                        <div className="bg-emerald-500/[0.03] dark:bg-emerald-500/[0.02] p-4 rounded-2xl border border-emerald-500/10 group-hover:border-emerald-500/20 transition-colors">
                          <p className="text-[9px] font-black text-emerald-500/80 uppercase mb-1 tracking-widest">Processed</p>
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-500">₹{fee.paidAmount.toLocaleString()}</p>
                        </div>
                      </div>

                      {pending > 0 && (
                        <div className="mb-8 space-y-3">
                          <div className="flex justify-between items-end">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Balance Pending</p>
                            <p className="text-sm font-black text-rose-500">₹{pending.toLocaleString()}</p>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(pending/fee.totalAmount)*100}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="flex items-stretch gap-3 relative">
                        {pending > 0 && (
                          <button
                            onClick={() => {
                              setSettlingFee(fee);
                              setSettleAmount("");
                            }}
                            className="flex-[3] h-12 flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-sm font-black uppercase tracking-tight shadow-xl hover:scale-[1.03] active:scale-95 transition-all px-4"
                          >
                            Settle ₹{pending.toLocaleString()}
                          </button>
                        )}
                        <div className={`flex gap-2 ${pending > 0 ? 'flex-1 justify-end' : 'w-full'}`}>
                          <button
                            onClick={() => handleEditInit(fee)}
                            className="h-12 w-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 transition-all shadow-sm"
                            title="Edit Record"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {fee.receiptData && (
                            <button
                              onClick={() => setViewingReceipt(fee)}
                              className="h-12 w-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 transition-all shadow-sm"
                              title="View Proof"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFee(fee.id)}
                            className="h-12 w-12 flex items-center justify-center text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all shadow-sm"
                            title="Delete Record"
                          >
                            <Trash2 className="h-4 w-4" />
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
            {settlingFee && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
                onClick={() => setSettlingFee(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-md w-full p-8 border border-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-center mb-8">
                    <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                      <IndianRupee className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Quick Settle</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">
                      Outstanding for {settlingFee.category}: <span className="text-rose-500">₹{settlingFee.pendingAmount.toLocaleString()}</span>
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={settleAmount}
                          onChange={(e) => setSettleAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-8 pr-5 py-4 text-lg font-black focus:border-emerald-500 transition-all dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSettleAmount(settlingFee.pendingAmount.toString())}
                        className="py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                      >
                        Settle Full
                      </button>
                      <button
                        onClick={() => setSettleAmount((settlingFee.pendingAmount / 2).toString())}
                        className="py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all"
                      >
                        Half Pay
                      </button>
                    </div>

                    <button
                      onClick={handleSettleFee}
                      className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                    >
                      Process Transaction
                    </button>
                    <button
                      onClick={() => setSettlingFee(null)}
                      className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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
