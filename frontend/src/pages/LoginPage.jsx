import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Home } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import Particles from "../components/Particles";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(false);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    const { data, error: apiError } = await api.login(email, password);

    if (apiError) {
      setError(apiError);
      return;
    }

    if (data && data.token) {
      onLogin(data);
      navigate("/dashboard", { replace: true });
    } else {
      setError("Invalid email or password.");
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* Particles Background */}
      <div className="absolute inset-0 z-0">
        <Particles
          particleColors={isDark ? ["#ffffff"] : ["#334155"]}
          particleCount={400}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover
          alphaParticles={false}
          disableRotation={false}
          pixelRatio={1}
        />
      </div>

      {/* Content */}
      <motion.div 
        className="relative z-10 w-full max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Link to="/" className="absolute -top-16 left-0 flex items-center gap-2 text-sm text-slate-500 hover:text-brand transition-colors">
          <Home size={16} /> Back to Home
        </Link>

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
            Welcome back to UNITRACK
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
              className="text-xs font-medium text-brand hover:text-brand-dark"
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
            className="mt-1 w-full rounded-xl bg-gradient-to-r from-brand to-accent text-white text-sm font-semibold py-2.5 shadow-md hover:shadow-xl transition-shadow duration-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.0 }}
            whileHover={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
            whileTap={{ scale: 0.98 }}
          >
            Sign in
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
              className="font-semibold text-brand hover:text-brand-dark dark:text-accent dark:hover:text-accent/80 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create new account
            </motion.button>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
