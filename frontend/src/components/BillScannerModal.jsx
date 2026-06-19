import { useState, useRef, useCallback } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  X,
  Check,
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Receipt,
} from "lucide-react";
import { scanReceipt, isConfigured } from "../services/receiptScannerService";
import { matchCategory } from "../utils/categoryMatcher";

/**
 * BillScannerModal
 *
 * Full-screen modal for scanning receipt images and auto-creating expenses.
 * Supports multi-receipt batch scanning.
 *
 * Phases:
 *   1. Upload — drag-drop, file picker, camera capture
 *   2. Processing — animated scanning visualization
 *   3. Review — editable pre-filled form with confidence indicators
 */

const PHASE = {
  UPLOAD: "upload",
  PROCESSING: "processing",
  REVIEW: "review",
};

const CONFIDENCE_CONFIG = {
  HIGH: {
    label: "High Confidence",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: ShieldCheck,
  },
  MEDIUM: {
    label: "Medium Confidence",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    icon: ShieldAlert,
  },
  LOW: {
    label: "Low Confidence",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    icon: ShieldQuestion,
  },
};

export default function BillScannerModal({ isOpen, onClose, categories, onSaveExpense }) {
  // Multi-receipt state
  const [receipts, setReceipts] = useState([]);
  // { id, file, preview, phase, result, editData, error, saving }
  const [activeIndex, setActiveIndex] = useState(0);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const dropRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const abortRef = useRef(null);

  const activeReceipt = receipts[activeIndex] || null;


  // ── SCAN FILE ──────────────────────────────────────
  const scanFile = useCallback(
    async (receiptId, file) => {
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === receiptId
            ? { ...r, phase: PHASE.PROCESSING, error: null }
            : r
        )
      );

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const result = await scanReceipt(file, controller.signal);

        // Match category to user's categories
        const categoryMatch = matchCategory(
          result.suggestedCategory,
          result.merchant,
          categories
        );

        const editData = {
          amount: result.amount || "",
          merchant: result.merchant || "",
          categoryId: categoryMatch.categoryId || "",
          categoryName: categoryMatch.categoryName || "",
          date: result.date || new Date().toISOString().split("T")[0],
          time: result.time || new Date().toTimeString().slice(0, 5),
          note: [result.merchant, result.billNumber].filter(Boolean).join(" — "),
          gstAmount: result.gstAmount,
          billNumber: result.billNumber,
          items: result.items || [],
        };

        setReceipts((prev) =>
          prev.map((r) =>
            r.id === receiptId
              ? { ...r, phase: PHASE.REVIEW, result, editData, error: null }
              : r
          )
        );
      } catch (err) {
        if (err.name === "AbortError") return;
        setReceipts((prev) =>
          prev.map((r) =>
            r.id === receiptId
              ? { ...r, phase: PHASE.UPLOAD, error: err.message }
              : r
          )
        );
      } finally {
        abortRef.current = null;
      }
    },
    [categories]
  );

  // Override addFiles to use scanFile
  const handleAddFiles = useCallback(
    (files) => {
      const newReceipts = Array.from(files).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
        phase: PHASE.UPLOAD,
        result: null,
        editData: null,
        error: null,
        saving: false,
      }));

      setReceipts((prev) => {
        const next = [...prev, ...newReceipts];
        return next;
      });

      setActiveIndex(receipts.length); // go to first new receipt

      // Start scanning each
      newReceipts.forEach((r) => scanFile(r.id, r.file));
    },
    [receipts.length, scanFile]
  );

  // ── DRAG & DROP ──────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleAddFiles(e.dataTransfer.files);
  };

  // ── FILE INPUT ──────────────────────────────────
  const handleFileChange = (e) => {
    if (e.target.files.length) handleAddFiles(e.target.files);
    e.target.value = "";
  };

  // ── EDIT FIELD ──────────────────────────────────
  const updateEditField = (field, value) => {
    setReceipts((prev) =>
      prev.map((r, i) =>
        i === activeIndex
          ? { ...r, editData: { ...r.editData, [field]: value } }
          : r
      )
    );
  };

  // ── SAVE ──────────────────────────────────────
  const handleSave = async () => {
    if (!activeReceipt?.editData) return;
    const { editData } = activeReceipt;

    setReceipts((prev) =>
      prev.map((r, i) => (i === activeIndex ? { ...r, saving: true } : r))
    );

    try {
      await onSaveExpense({
        amount: parseFloat(editData.amount),
        categoryId: editData.categoryId || null,
        date: editData.date || null,
        time: editData.time || null,
        note: editData.note || null,
      });

      // Mark as saved and remove from list
      setReceipts((prev) => prev.filter((_, i) => i !== activeIndex));
      setActiveIndex((prev) => Math.min(prev, Math.max(0, receipts.length - 2)));
    } catch (err) {
      setReceipts((prev) =>
        prev.map((r, i) =>
          i === activeIndex
            ? { ...r, saving: false, error: err.message || "Failed to save" }
            : r
        )
      );
    }
  };

  // ── SAVE ALL ──────────────────────────────────
  const handleSaveAll = async () => {
    const reviewReceipts = receipts.filter((r) => r.phase === PHASE.REVIEW && r.editData);
    for (const receipt of reviewReceipts) {
      try {
        await onSaveExpense({
          amount: parseFloat(receipt.editData.amount),
          categoryId: receipt.editData.categoryId || null,
          date: receipt.editData.date || null,
          time: receipt.editData.time || null,
          note: receipt.editData.note || null,
        });
      } catch {
        // Continue with others
      }
    }
    setReceipts((prev) => prev.filter((r) => r.phase !== PHASE.REVIEW));
    setActiveIndex(0);
    if (receipts.filter((r) => r.phase !== PHASE.REVIEW).length === 0) {
      onClose();
    }
  };

  // ── REMOVE RECEIPT ──────────────────────────────
  const removeReceipt = (index) => {
    setReceipts((prev) => prev.filter((_, i) => i !== index));
    setActiveIndex((prev) => Math.min(prev, Math.max(0, receipts.length - 2)));
  };

  // ── RETRY ──────────────────────────────────
  const handleRetry = () => {
    if (activeReceipt) {
      scanFile(activeReceipt.id, activeReceipt.file);
    }
  };

  // ── CANCEL ──────────────────────────────────
  const handleAbort = () => {
    if (abortRef.current) abortRef.current.abort();
  };

  // ── CLOSE ──────────────────────────────────
  const handleClose = () => {
    handleAbort();
    receipts.forEach((r) => {
      if (r.preview) URL.revokeObjectURL(r.preview);
    });
    setReceipts([]);
    setActiveIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  const reviewCount = receipts.filter((r) => r.phase === PHASE.REVIEW).length;
  const processingCount = receipts.filter((r) => r.phase === PHASE.PROCESSING).length;

  // ── RENDER ──────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Scan Bills
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {receipts.length === 0
                    ? "Upload receipt photos to auto-create expenses"
                    : `${receipts.length} receipt${receipts.length > 1 ? "s" : ""} • ${reviewCount} ready • ${processingCount} scanning`}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            {/* API Key Warning */}
            {!isConfigured() && (
              <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Gemini API key not configured</p>
                  <p className="text-xs mt-1 opacity-80">
                    Add <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 font-mono text-xs">VITE_GEMINI_API_KEY=your_key</code> to your <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 font-mono text-xs">.env</code> file and restart the dev server.
                  </p>
                </div>
              </div>
            )}

            {/* Upload Zone — always visible */}
            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                isDragging
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 scale-[1.02]"
                  : "border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600 bg-slate-50/50 dark:bg-slate-800/30"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                className={`p-4 rounded-2xl transition-all ${
                  isDragging
                    ? "bg-violet-100 dark:bg-violet-900/40 text-violet-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}
              >
                <Upload className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {isDragging ? "Drop your bills here" : "Drag & drop receipt images"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  JPG, PNG, WebP • Max 5MB per file • Multiple files supported
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors shadow-sm"
                >
                  <ImageIcon className="h-4 w-4" />
                  Browse Files
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm font-bold transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Camera
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Receipt Tabs — only if we have receipts */}
            {receipts.length > 0 && (
              <div className="mt-6">
                {/* Tab bar */}
                {receipts.length > 1 && (
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    {receipts.map((r, i) => (
                      <button
                        key={r.id}
                        onClick={() => setActiveIndex(i)}
                        className={`relative flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          i === activeIndex
                            ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800"
                            : "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {r.phase === PHASE.PROCESSING && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        {r.phase === PHASE.REVIEW && (
                          <Check className="h-3 w-3 text-emerald-500" />
                        )}
                        {r.phase === PHASE.UPLOAD && r.error && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                        Receipt {i + 1}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeReceipt(i);
                          }}
                          className="ml-1 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </button>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-800/50 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600 hover:text-violet-600 transition-all"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                )}

                {/* Active Receipt Content */}
                {activeReceipt && (
                  <div>
                    {/* Processing Phase */}
                    {activeReceipt.phase === PHASE.PROCESSING && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-6 py-8"
                      >
                        <div className="relative">
                          <img
                            src={activeReceipt.preview}
                            alt="Receipt"
                            className="w-48 h-64 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg"
                          />
                          {/* Scanning shimmer effect */}
                          <div className="absolute inset-0 rounded-xl overflow-hidden">
                            <motion.div
                              className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-80"
                              animate={{ y: [0, 256, 0] }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-6 w-6 text-violet-500 animate-spin" />
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Scanning receipt...
                          </p>
                          <p className="text-xs text-slate-400">
                            Extracting amount, merchant, and category
                          </p>
                        </div>
                        <button
                          onClick={handleAbort}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                          Cancel scan
                        </button>
                      </motion.div>
                    )}

                    {/* Error State */}
                    {activeReceipt.phase === PHASE.UPLOAD && activeReceipt.error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4 py-6"
                      >
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500">
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                            Scan Failed
                          </p>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm">
                            {activeReceipt.error}
                          </p>
                        </div>
                        <button
                          onClick={handleRetry}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Retry
                        </button>
                      </motion.div>
                    )}

                    {/* Review Phase */}
                    {activeReceipt.phase === PHASE.REVIEW && activeReceipt.editData && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-5"
                      >
                        {/* Confidence Badge */}
                        {activeReceipt.result && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img
                                src={activeReceipt.preview}
                                alt="Receipt"
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                              />
                              <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {activeReceipt.editData.merchant || "Receipt"}
                                </p>
                                {activeReceipt.editData.billNumber && (
                                  <p className="text-[10px] text-slate-400">
                                    #{activeReceipt.editData.billNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                            {(() => {
                              const conf =
                                CONFIDENCE_CONFIG[activeReceipt.result.confidence] ||
                                CONFIDENCE_CONFIG.MEDIUM;
                              const Icon = conf.icon;
                              return (
                                <div
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${conf.bg} ${conf.color} ${conf.border} border`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {conf.label}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Amount — Large */}
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Amount
                          </label>
                          <div
                            className={`mt-1 flex items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                              activeReceipt.result?.fieldConfidence?.amount === "LOW"
                                ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
                                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                            }`}
                          >
                            <IndianRupee className="h-5 w-5 text-slate-400 flex-shrink-0" />
                            <input
                              type="number"
                              step="0.01"
                              value={activeReceipt.editData.amount}
                              onChange={(e) =>
                                updateEditField("amount", e.target.value)
                              }
                              className="flex-1 bg-transparent text-2xl font-bold text-slate-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0.00"
                            />
                            {activeReceipt.result?.fieldConfidence?.amount === "LOW" && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex-shrink-0">
                                Review
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Merchant */}
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Merchant
                          </label>
                          <input
                            type="text"
                            value={activeReceipt.editData.merchant}
                            onChange={(e) =>
                              updateEditField("merchant", e.target.value)
                            }
                            className={`mt-1 w-full px-4 py-2.5 rounded-xl border text-sm font-medium bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none transition-colors focus:border-violet-400 dark:focus:border-violet-600 ${
                              activeReceipt.result?.fieldConfidence?.merchant === "LOW"
                                ? "border-amber-300 dark:border-amber-700"
                                : "border-slate-200 dark:border-slate-700"
                            }`}
                            placeholder="e.g. Domino's Pizza"
                          />
                        </div>

                        {/* Category + Date row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Category
                            </label>
                            <select
                              value={activeReceipt.editData.categoryId}
                              onChange={(e) =>
                                updateEditField("categoryId", e.target.value)
                              }
                              className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none transition-colors focus:border-violet-400 dark:focus:border-violet-600"
                            >
                              <option value="">Select category</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Date
                            </label>
                            <input
                              type="date"
                              value={activeReceipt.editData.date}
                              onChange={(e) =>
                                updateEditField("date", e.target.value)
                              }
                              className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none transition-colors focus:border-violet-400 dark:focus:border-violet-600"
                            />
                          </div>
                        </div>

                        {/* Note */}
                        <div>
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Note
                          </label>
                          <input
                            type="text"
                            value={activeReceipt.editData.note}
                            onChange={(e) =>
                              updateEditField("note", e.target.value)
                            }
                            className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none transition-colors focus:border-violet-400 dark:focus:border-violet-600"
                            placeholder="Optional note"
                          />
                        </div>

                        {/* Line Items (if available) */}
                        {activeReceipt.editData.items?.length > 0 && (
                          <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Items Detected
                            </label>
                            <div className="mt-1 flex flex-col gap-1">
                              {activeReceipt.editData.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs"
                                >
                                  <span className="text-slate-600 dark:text-slate-400">
                                    {item.name}
                                  </span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    ₹{item.amount}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* GST info */}
                        {activeReceipt.editData.gstAmount && (
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg">
                            <span>GST detected:</span>
                            <span className="font-bold">
                              ₹{activeReceipt.editData.gstAmount}
                            </span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={handleSave}
                            disabled={
                              !activeReceipt.editData.amount ||
                              activeReceipt.saving
                            }
                            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {activeReceipt.saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Save Expense
                          </button>

                          {reviewCount > 1 && (
                            <button
                              onClick={handleSaveAll}
                              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-sm font-bold border border-emerald-200 dark:border-emerald-800 transition-all"
                            >
                              <Sparkles className="h-4 w-4" />
                              Save All ({reviewCount})
                            </button>
                          )}

                          <button
                            onClick={() => removeReceipt(activeIndex)}
                            className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Navigation arrows for multiple receipts */}
                {receipts.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() =>
                        setActiveIndex((prev) => Math.max(0, prev - 1))
                      }
                      disabled={activeIndex === 0}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {activeIndex + 1} / {receipts.length}
                    </span>
                    <button
                      onClick={() =>
                        setActiveIndex((prev) =>
                          Math.min(receipts.length - 1, prev + 1)
                        )
                      }
                      disabled={activeIndex === receipts.length - 1}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
