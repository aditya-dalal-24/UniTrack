import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Home } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import Particles from "../components/Particles";
import OtpVerificationModal from "../components/OtpVerificationModal";
import ForgotPasswordModal from "../components/ForgotPasswordModal";


const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";


export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Initialize dark mode on mount
  useEffect(() => {
    const stored = localStorage.getItem("darkMode");
    if (stored === null || stored === "true") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
      setIsDark(true);
    } else {
      setIsDark(false);
    }

    // Watch for dark mode changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Google Identity Services callback
  const handleGoogleResponse = useCallback(async (response) => {
    setGoogleLoading(true);
    setError("");

    const { data, error: apiError } = await api.googleLogin(response.credential);

    if (apiError) {
      setError(apiError);
      setGoogleLoading(false);
      return;
    }

    if (data && data.token) {
      onLogin(data);
      const dest = data.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
      navigate(dest, { replace: true });
    } else {
      setError("Google sign-in failed. Please try again.");
    }
    setGoogleLoading(false);
  }, [onLogin, navigate]);

  // Load Google Identity Services script
  useEffect(() => {
    if (GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID") return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          itp_support: true,
          ux_mode: "popup",
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-login-btn"),
          {
            theme: isDark ? "filled_black" : "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            shape: "pill",
          }
        );
      }
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) existingScript.remove();
    };
  }, [isDark, handleGoogleResponse]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setIsWakingUp(false);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    // Timer to show "Waking up" message if request takes > 3s
    const wakingTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 3000);

    try {
      const { data, error: apiError } = await api.login(email, password);
      clearTimeout(wakingTimer);

      if (apiError) {
        if (apiError.toLowerCase().includes("network error") || apiError.toLowerCase().includes("check your connection")) {
          setError("Still waking up the server... This can take up to 50 seconds on first load. Please try again in a moment.");
        } else {
          setError(apiError);
        }
        setLoading(false);
        setIsWakingUp(false);
        return;
      }

      if (data && data.emailVerified === false) {
        setPendingEmail(data.email);
        setShowOtpModal(true);
        setLoading(false);
        setIsWakingUp(false);
        return;
      }

      if (data && data.token) {
        onLogin(data);
        const dest = data.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
        navigate(dest, { replace: true });
      } else {
        setError("Invalid email or password.");
        setLoading(false);
        setIsWakingUp(false);
      }
    } catch (err) {
      clearTimeout(wakingTimer);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
      setIsWakingUp(false);
    }
  }

  function handleOtpVerified(authData) {
    setShowOtpModal(false);
    onLogin(authData);
    const dest = authData.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
    navigate(dest, { replace: true });
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* Particles Background */}
      <div className="absolute inset-0 z-0">
        <Particles
          particleColors={isDark ? ["#ffffff"] : ["#334155"]}
          particleCount={600}
          particleSpread={12}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover
          alphaParticles={false}
          disableRotation={false}
          pixelRatio={1}
        />
      </div>

      {/* Back to Home Link */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute top-8 left-8 z-50"
      >
        <Link 
          to="/" 
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-white transition-all hover:shadow-lg group"
        >
          <Home className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
          <span className="text-sm font-semibold tracking-wide">Back to Home</span>
        </Link>
      </motion.div>

      {/* Content */}
      <motion.div 
        className="relative z-10 w-full max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >

        {/* Header */}
        <motion.div 
          className="mb-6 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200/60 dark:border-slate-800/60"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <motion.span 
              className="h-2 w-2 rounded-full bg-emerald-400"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            Welcome back to UniTrack
          </motion.div>
          <motion.h1 
            className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Sign in to your account
          </motion.h1>
          <motion.p 
            className="mt-1 text-sm text-slate-500 dark:text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            Manage your college attendance, assignments, marks, fees, expenses and more in one place.
          </motion.p>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/70 px-5 py-6 shadow-xl backdrop-blur"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {/* Google Sign-In Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
          >
            {GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID" ? (
              <div id="google-login-btn" className="flex justify-center" />
            ) : (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google Sign-In (Client ID required)
              </button>
            )}
          </motion.div>

          {/* Divider */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.68 }}
          >
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </motion.div>

          {/* Email Field */}
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Email
            </label>
            <motion.div 
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-2.5 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/20 transition-all"
              whileFocus={{ scale: 1.01 }}
            >
              <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                type="email"
                className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </motion.div>
          </motion.div>

          {/* Password Field */}
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          >
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Password
            </label>
            <motion.div 
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/40 px-4 py-2.5 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/20 transition-all"
              whileFocus={{ scale: 1.01 }}
            >
              <Lock className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <motion.button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Remember Me & Forgot Password */}
          <motion.div 
            className="flex items-center justify-between text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.9 }}
          >
            <label className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-brand focus:ring-brand"
              />
              <span>Remember me</span>
            </label>

            <motion.button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-xs font-medium text-brand dark:text-blue-400 hover:text-brand-dark dark:hover:text-blue-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Forgot password?
            </motion.button>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div 
              className="rounded-xl bg-red-50 text-red-600 text-xs px-3 py-2 border border-red-100 flex items-start gap-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            className={`mt-1 w-full rounded-xl bg-gradient-to-r from-brand to-accent dark:from-brand-light dark:to-accent text-white dark:text-white text-sm font-semibold py-2.5 shadow-md shadow-brand/25 dark:shadow-brand/40 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-wait' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.0 }}
            whileHover={!loading ? { scale: 1.02, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
          >
            {loading ? (
              <>
                <motion.div
                  className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>{isWakingUp ? "Waking up server..." : "Signing in..."}</span>
              </>
            ) : (
              "Sign in"
            )}
          </motion.button>

          {/* Terms */}
          <motion.p 
            className="text-[11px] text-center text-slate-400 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.1 }}
          >
            By continuing, you agree to the{" "}
            <span className="underline">terms</span> and{" "}
            <span className="underline">privacy policy</span>.
          </motion.p>
        </motion.form>

        {/* Create Account Section */}
        <motion.div 
          className="mt-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{" "}
            <motion.button
              type="button"
              onClick={() => navigate("/signup")}
              className="font-semibold text-brand hover:text-brand-dark dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create new account
            </motion.button>
          </p>
        </motion.div>
      </motion.div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <OtpVerificationModal
          email={pendingEmail}
          onVerified={handleOtpVerified}
          onClose={() => setShowOtpModal(false)}
        />
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
        />
      )}
    </div>
  );
}
