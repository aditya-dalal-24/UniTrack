import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, User, Phone, Calendar, GraduationCap, BookOpen, Hash, Home } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import Particles from "../components/Particles";

export default function SignupPage({ onLogin }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    university: "",
    course: "",
    year: "",
    semester: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.fullName || !formData.email || !formData.university || !formData.course || !formData.year || !formData.semester || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      // Call backend API to create user
      const { data, error: apiError } = await api.signup(formData);
      
      if (apiError) {
        setError(apiError);
        return;
      }

      if (data && data.token) {
        // Store via AuthContext — pass the consolidated object
        onLogin({
          ...data,
          phone: formData.phone,
          university: formData.university,
          course: formData.course,
          year: formData.year,
          semester: formData.semester,
        });
        
        navigate("/dashboard", { replace: true });
      } else {
        setError("Signup failed. Please try again.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError("An error occurred during signup. Please try again.");
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500 py-8">
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

      {/* Back to Home Link */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute top-8 left-8 z-50"
      >
        <Link 
          to="/" 
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-brand transition-all hover:shadow-lg group"
        >
          <Home className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
          <span className="text-sm font-semibold tracking-wide">Back to Home</span>
        </Link>
      </motion.div>

      <motion.div 
        className="relative z-10 w-full max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
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
            Join UNITRACK Today
          </motion.div>
          <motion.h1 
            className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Create your account
          </motion.h1>
          <motion.p 
            className="mt-1 text-sm text-slate-500 dark:text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            Start managing your college life efficiently
          </motion.p>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/70 px-5 py-6 shadow-xl backdrop-blur"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {/* Full Name Field */}
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Full Name <span className="text-red-500">*</span>
            </label>
            <motion.div 
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-3 py-2 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/30 transition-all"
              whileFocus={{ scale: 1.01 }}
            >
              <User className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="fullName"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
              />
            </motion.div>
          </motion.div>

          {/* Email Field */}
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.75 }}
          >
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Email <span className="text-red-500">*</span>
            </label>
            <motion.div 
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-3 py-2 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/30 transition-all"
              whileFocus={{ scale: 1.01 }}
            >
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                type="email"
                name="email"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </motion.div>
          </motion.div>

          {/* Phone Field */}
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          >
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Phone Number
            </label>
            <motion.div 
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-3 py-2 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/30 transition-all"
              whileFocus={{ scale: 1.01 }}
            >
              <Phone className="h-4 w-4 text-slate-400" />
              <input
                type="tel"
                name="phone"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={handleChange}
              />
            </motion.div>
          </motion.div>

          {/* Date of Birth Field */}
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.85 }}
          >
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Date of Birth
            </label>
            <motion.div 
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-3 py-2 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/30 transition-all"
              whileFocus={{ scale: 1.01 }}
            >
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                name="dateOfBirth"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                value={formData.dateOfBirth}
                onChange={handleChange}
              />
            </motion.div>
          </motion.div>

          {/* University Field */}
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.87 }}
          >
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              University Name <span className="text-red-500">*</span>
            </label>
            <motion.div 
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-3 py-2 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/30 transition-all"
              whileFocus={{ scale: 1.01 }}
            >
              <GraduationCap className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="university"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Harvard University"
                value={formData.university}
                onChange={handleChange}
              />
            </motion.div>
          </motion.div>

          {/* Course Field */}
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.88 }}
          >
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Course <span className="text-red-500">*</span>
            </label>
            <motion.div 
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-3 py-2 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/30 transition-all"
              whileFocus={{ scale: 1.01 }}
            >
              <BookOpen className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="course"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Computer Science"
                value={formData.course}
                onChange={handleChange}
              />
            </motion.div>
          </motion.div>

          {/* Year and Semester Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Year Field */}
            <motion.div 
              className="space-y-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.89 }}
            >
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Year <span className="text-red-500">*</span>
              </label>
              <motion.div 
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-3 py-2 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/30 transition-all"
                whileFocus={{ scale: 1.01 }}
              >
                <Hash className="h-4 w-4 text-slate-400" />
                <select
                  name="year"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  value={formData.year}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </motion.div>
            </motion.div>

            {/* Semester Field */}
            <motion.div 
              className="space-y-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.90 }}
            >
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Semester <span className="text-red-500">*</span>
              </label>
              <motion.div 
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-3 py-2 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/30 transition-all"
                whileFocus={{ scale: 1.01 }}
              >
                <Hash className="h-4 w-4 text-slate-400" />
                <select
                  name="semester"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  value={formData.semester}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                  <option value="7">Semester 7</option>
                  <option value="8">Semester 8</option>
                </select>
              </motion.div>
            </motion.div>
          </div>

          {/* Password Field */}
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.9 }}
          >
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Password <span className="text-red-500">*</span>
            </label>
            <motion.div 
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-3 py-2 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/30 transition-all"
              whileFocus={{ scale: 1.01 }}
            >
              <Lock className="h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
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

          {/* Confirm Password Field */}
          <motion.div 
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.95 }}
          >
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <motion.div 
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-3 py-2 focus-within:border-brand/70 focus-within:ring-2 focus-within:ring-brand/30 transition-all"
              whileFocus={{ scale: 1.01 }}
            >
              <Lock className="h-4 w-4 text-slate-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <motion.button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-brand hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </motion.button>
            </motion.div>
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
            Create Account
          </motion.button>

          {/* Terms */}
          <motion.p 
            className="text-[11px] text-center text-slate-400 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.1 }}
          >
            By creating an account, you agree to the{" "}
            <span className="underline">terms</span> and{" "}
            <span className="underline">privacy policy</span>.
          </motion.p>
        </motion.form>

        {/* Login Link */}
        <motion.div 
          className="mt-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{" "}
            <motion.button
              type="button"
              onClick={() => navigate("/login")}
              className="font-semibold text-brand hover:text-brand-dark dark:text-accent dark:hover:text-accent/80 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign in
            </motion.button>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
