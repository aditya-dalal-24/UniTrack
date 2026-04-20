import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound, RefreshCw, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";

/**
 * Multi-step Forgot Password modal:
 *   Step 1 — Enter email → sends OTP
 *   Step 2 — Enter OTP + new password → resets password
 *   Step 3 — Success confirmation
 */
export default function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1); // 1=email, 2=otp+password, 3=success
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef([]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus first OTP input when step 2 mounts
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  }, [step]);

  // ==================== Step 1: Request OTP ====================
  async function handleRequestOtp(e) {
    e?.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: apiError } = await api.forgotPassword(email);

    if (apiError) {
      setError(apiError);
      setLoading(false);
      return;
    }

    setResendCooldown(60);
    setStep(2);
    setLoading(false);
  }

  // ==================== Step 2: Verify OTP + Reset ====================
  function handleOtpChange(index, value) {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);
    const lastIndex = Math.min(pasted.length, 5);
    inputRefs.current[lastIndex]?.focus();
  }

  async function handleResetPassword() {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: apiError } = await api.resetPassword(email, code, newPassword);

    if (apiError) {
      setError(apiError);
      setLoading(false);
      return;
    }

    setStep(3);
    setLoading(false);
  }

  // ==================== Resend OTP ====================
  async function handleResend() {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    setError("");

    const { error: apiError } = await api.forgotPassword(email);

    if (apiError) {
      setError(apiError);
    } else {
      setResendCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
    setResendLoading(false);
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X size={18} />
          </button>

          {/* ==================== STEP 1: Email Input ==================== */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <motion.div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/30 mb-3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                >
                  <KeyRound className="h-7 w-7 text-amber-500" />
                </motion.div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  Forgot Password
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Enter your email and we'll send you a reset code.
                </p>
              </div>

              {/* Email input */}
              <form onSubmit={handleRequestOtp}>
                <div className="space-y-1 mb-4">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-2.5 focus-within:border-amber-400/70 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
                    <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <input
                      type="email"
                      className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs px-3 py-2 border border-red-100 dark:border-red-800/40 flex items-start gap-2 mb-4"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold py-2.5 shadow-md hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                  whileHover={!loading ? { scale: 1.02 } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sending Code...
                    </span>
                  ) : (
                    "Send Reset Code"
                  )}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ==================== STEP 2: OTP + New Password ==================== */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Back button */}
              <button
                onClick={() => { setStep(1); setError(""); setOtp(["", "", "", "", "", ""]); }}
                className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-4 transition-colors"
              >
                <ArrowLeft size={14} />
                Back
              </button>

              {/* Header */}
              <div className="text-center mb-5">
                <motion.div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/30 mb-3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                >
                  <KeyRound className="h-7 w-7 text-amber-500" />
                </motion.div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  Reset Password
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Enter the code sent to
                </p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {email}
                </p>
              </div>

              {/* OTP Inputs */}
              <div className="flex justify-center gap-2 mb-4">
                {otp.map((digit, index) => (
                  <motion.input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-11 h-13 text-center text-xl font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.04 }}
                  />
                ))}
              </div>

              {/* New Password */}
              <div className="space-y-3 mb-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    New Password
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-2.5 focus-within:border-amber-400/70 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
                    <Lock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-2.5 focus-within:border-amber-400/70 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
                    <Lock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs px-3 py-2 border border-red-100 dark:border-red-800/40 flex items-start gap-2 mb-4"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Reset Button */}
              <motion.button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold py-2.5 shadow-md hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </motion.button>

              {/* Resend */}
              <div className="text-center mt-4">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Didn't receive the code?{" "}
                  {resendCooldown > 0 ? (
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={resendLoading}
                      className="font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors disabled:opacity-50"
                    >
                      {resendLoading ? "Sending..." : "Resend Code"}
                    </button>
                  )}
                </p>
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 3: Success ==================== */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </motion.div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                Password Reset!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              <motion.button
                onClick={onClose}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold py-2.5 shadow-md hover:shadow-xl transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Back to Sign In
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
