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
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    if (!userData.semester) {
      api.getProfile().then(({ data }) => {
        if (data && data.semester) {
          userData.semester = data.semester;
          localStorage.setItem("userData", JSON.stringify(userData));
          if (selectedSemester === 1) setSelectedSemester(parseInt(data.semester));
        }
      });
    }
    fetchFees();
  }, [selectedSemester]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit as per user hint "single image or simple pdf"
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

    // Optimistic UI Update
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

    const { error: apiError } = await api.addFee(payload);
    if (apiError) {
      setFeesSummary(prevSummary); // Rollback
      alert(apiError);
      return;
    }

    await fetchFees(false);
    invalidateDashboard();
    setNewFee({ category: "College", customCategory: "", amount: "", paid: "", dueDate: "", receiptData: null, receiptFileName: "" });
    setShowAddFee(false);
  };

  const handleDeleteFee = async (id) => {
    if (!confirm("Delete this fee record?")) return;
    
    const prevSummary = { ...feesSummary };
    setFeesSummary({
      ...feesSummary,
      fees: feesSummary.fees.filter(f => f.id !== id)
    }); // Optimistic UI

    const { error } = await api.deleteFee(id);
    if (error) {
      setFeesSummary(prevSummary); // Rollback
      alert(error);
    } else {
      fetchFees(false);
      invalidateDashboard();
    }
  };

  const totalFees = feesSummary?.totalFees || 0;
  const totalPaid = feesSummary?.totalPaid || 0;
  const totalPending = feesSummary?.totalPending || 0;
  const currentSemesterFees = feesSummary?.fees || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Management"
        description="Track your college and hostel fee payments."
        actions={
          <button
            onClick={() => setShowAddFee(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand text-white px-4 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:bg-brand-dark transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Fee Record
          </button>
        }
      />

      {loading && <LoadingSpinner message="Loading fees..." />}
      {error && <ErrorMessage message={error} onRetry={fetchFees} />}

      {!loading && !error && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Fees</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    ₹{totalFees.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 flex items-center justify-center">
                  <IndianRupee className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Paid</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{totalPaid.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Pending</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ₹{totalPending.toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-200/60 dark:border-slate-800/60 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-brand/10 text-brand dark:text-brand-light flex items-center justify-center">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="w-full">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Semester</p>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                    className="mt-1 w-full bg-transparent border-none text-xl font-bold text-slate-900 dark:text-slate-100 focus:ring-0 p-0 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <option key={sem} value={sem} className="text-base text-slate-900 dark:text-slate-100">
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {showAddFee && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Add New Fee Record
                    </h3>
                    <button
                      onClick={() => setShowAddFee(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
                      <div className="relative">
                        <select
                          value={newFee.category}
                          onChange={(e) => setNewFee({ ...newFee, category: e.target.value })}
                          className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all dark:text-white"
                        >
                          <option value="College">College Fee</option>
                          <option value="Hostel">Hostel Fee</option>
                          <option value="Library">Library Fine</option>
                          <option value="Other">Other (Specify)</option>
                        </select>
                      </div>
                    </div>

                    {newFee.category === "Other" && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category Name *</label>
                        <input
                          type="text"
                          value={newFee.customCategory}
                          onChange={(e) => setNewFee({ ...newFee, customCategory: e.target.value })}
                          placeholder="e.g. Exam Fee"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                        />
                      </motion.div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Total Amount *</label>
                      <input
                        type="number"
                        value={newFee.amount}
                        onChange={(e) => setNewFee({ ...newFee, amount: e.target.value })}
                        placeholder="Enter total amount"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Paid Amount</label>
                      <input
                        type="number"
                        value={newFee.paid}
                        onChange={(e) => setNewFee({ ...newFee, paid: e.target.value })}
                        placeholder="Enter paid amount (optional)"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Due Date *</label>
                      <input
                        type="date"
                        value={newFee.dueDate}
                        onChange={(e) => setNewFee({ ...newFee, dueDate: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Receipt (Optional)</label>
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm flex items-center justify-center gap-2 transition-all ${newFee.receiptFileName ? 'border-brand bg-brand/5' : 'group-hover:border-brand/40 group-hover:bg-slate-50'}`}>
                          {newFee.receiptFileName ? (
                            <>
                              <FileText className="h-4 w-4 text-brand dark:text-brand-400" />
                              <span className="text-brand dark:text-brand-400 font-medium truncate max-w-[200px]">{newFee.receiptFileName}</span>
                              <button onClick={(e) => { e.stopPropagation(); setNewFee({...newFee, receiptData: null, receiptFileName: ""}) }} className="ml-auto text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400">
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                              <span className="text-slate-500 dark:text-slate-400">Click to upload receipt (Image or PDF)</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => setShowAddFee(false)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddFee}
                      className="px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark transition-all"
                    >
                      Add Fee
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fees Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Fee Details - Semester {selectedSemester}
              </h3>
            </div>

            {currentSemesterFees.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">No fees added for this semester</p>
                <button
                  onClick={() => setShowAddFee(true)}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-brand hover:text-brand-dark font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add your first fee
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-0">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 text-center">Category</th>
                      <th className="px-4 sm:px-6 py-4 text-center">Total Amount</th>
                      <th className="px-4 sm:px-6 py-4 text-center">Paid Amount</th>
                      <th className="px-4 sm:px-6 py-4 text-center">Pending</th>
                      <th className="px-4 sm:px-6 py-4 text-center">Status</th>
                      <th className="px-4 sm:px-6 py-4 text-center">Due Date</th>
                      <th className="px-4 sm:px-6 py-4 text-center">Receipt</th>
                      <th className="px-4 sm:px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentSemesterFees.map((fee, index) => {
                      const pending = fee.pendingAmount;
                      const statusColor = fee.status === FEES_STATUS.PAID 
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : fee.status === FEES_STATUS.PARTIAL
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400";
                        
                      return (
                        <motion.tr
                          key={fee.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.05 }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-4 sm:px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center bg-brand/10 text-brand dark:text-brand-400`}>
                                {getCategoryIcon(fee.category)}
                              </div>
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {fee.category}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center text-slate-600 dark:text-slate-400">
                            ₹{fee.totalAmount?.toLocaleString() || 0}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                            ₹{fee.paidAmount?.toLocaleString() || 0}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center">
                            {pending > 0 ? (
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                ₹{pending.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                              {fee.status}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center text-slate-500 dark:text-slate-400 text-xs">
                            {fee.dueDate}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center">
                            {fee.receiptData ? (
                              <button 
                                onClick={() => setViewingReceipt(fee)}
                                className="p-2 rounded-lg bg-brand/10 text-brand dark:text-brand-400 hover:bg-brand/20 transition-all"
                                title="View Receipt"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700">-</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center">
                            <button
                              onClick={() => handleDeleteFee(fee.id)}
                              className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
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

          {/* Receipt Viewer Modal */}
          <AnimatePresence>
            {viewingReceipt && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={() => setViewingReceipt(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{viewingReceipt.category} Receipt</h3>
                      <p className="text-xs text-slate-500">{viewingReceipt.receiptFileName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={viewingReceipt.receiptData} 
                        download={viewingReceipt.receiptFileName}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand transition-all"
                        title="Download"
                      >
                        <Download className="h-5 w-5" />
                      </a>
                      <button 
                        onClick={() => setViewingReceipt(null)}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-500 transition-all"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-950 p-6 flex items-center justify-center">
                    {viewingReceipt.receiptData.startsWith('data:application/pdf') ? (
                      <iframe
                        src={viewingReceipt.receiptData}
                        className="w-full h-full min-h-[60vh] rounded-lg shadow-sm"
                        title="Receipt PDF"
                      />
                    ) : (
                      <img
                        src={viewingReceipt.receiptData}
                        alt="Receipt"
                        className="max-w-full h-auto rounded-lg shadow-sm"
                      />
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
