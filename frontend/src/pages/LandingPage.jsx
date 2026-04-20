import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sun, Moon } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import LightRays from "../components/LightRays";

function WordCycle({ isDark }) {
    const lightModeCategories = [
        { text: "attendance", color: "from-emerald-700 to-teal-900" },
        { text: "assignments", color: "from-indigo-700 to-blue-900" },
        { text: "college fees", color: "from-amber-700 to-orange-900" },
        { text: "marks", color: "from-rose-700 to-pink-900" },
        { text: "expenses", color: "from-cyan-700 to-blue-900" },
        { text: "timetables", color: "from-violet-700 to-purple-900" },
        { text: "productivity", color: "from-slate-900 to-indigo-900" }
    ];

    const darkModeCategories = [
        { text: "attendance", color: "from-emerald-400 to-teal-300" },
        { text: "assignments", color: "from-blue-400 to-indigo-300" },
        { text: "college fees", color: "from-amber-400 to-orange-300" },
        { text: "marks", color: "from-rose-400 to-pink-300" },
        { text: "expenses", color: "from-cyan-400 to-blue-300" },
        { text: "timetables", color: "from-violet-400 to-purple-300" },
        { text: "productivity", color: "from-brand-light to-purple-300" }
    ];

    const categories = isDark ? darkModeCategories : lightModeCategories;
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % categories.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [categories.length]);

    return (
        <span className="inline-grid text-center min-w-[240px] sm:min-w-[380px] md:min-w-[480px]">
            <AnimatePresence mode="wait">
                <motion.span
                    key={categories[index].text}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ 
                        duration: 0.5, 
                        type: "spring", 
                        stiffness: 100, 
                        damping: 18 
                    }}
                    className={`col-start-1 row-start-1 inline-block text-transparent bg-clip-text bg-gradient-to-r ${categories[index].color}`}
                >
                    {categories[index].text}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

export default function LandingPage() {
    const navigate = useNavigate();
    const { isDark, toggleDarkMode } = useAuth();

    return (
        <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-white dark:bg-neutral-950 transition-colors duration-500">
            {/* Navbar Overlay */}
            <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 sm:p-6 lg:px-12 mx-auto max-w-screen-2xl">
                <div className="flex lg:flex-1">
                    <Link to="/" className="-m-1.5 p-1.5 flex items-center gap-2 group">
                        <div className="p-1 rounded-xl group-hover:scale-110 transition-transform duration-300">
                            <img src="/unitrack-logo.png" alt="UniTrack Logo" className="h-9 w-9 object-contain" />
                        </div>
                        <span className="font-black text-2xl tracking-tighter text-slate-900 dark:text-white">UNITRACK</span>
                    </Link>
                </div>
                <div className="flex flex-1 justify-end items-center gap-2 sm:gap-4 md:gap-8">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all hover:shadow-sm"
                    >
                        {isDark ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-slate-600" />}
                    </button>

                    <Link to="/login" className="text-xs sm:text-sm font-bold tracking-wide text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-white transition-colors">
                        SIGN IN
                    </Link>
                    <Link
                        to="/signup"
                        className="hidden sm:flex group relative px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full text-xs font-bold tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95"
                    >
                        <span className="relative z-10">Sign up for Free</span>
                        <div className="absolute inset-0 bg-brand dark:bg-slate-100 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                    </Link>
                </div>
            </nav>

            {/* LightRays Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <LightRays
                    raysOrigin="top-center"
                    raysColor={isDark ? "#ffffff" : "#e2e8f0"}
                    raysSpeed={0.8}
                    lightSpread={isDark ? 0.6 : 0.8}
                    rayLength={3}
                    followMouse={true}
                    mouseInfluence={0.1}
                    noiseAmount={0}
                    distortion={0}
                    className="custom-rays"
                    pulsating={false}
                    fadeDistance={1}
                    saturation={1}
                />
            </div>

            {/* Content Section */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1 }}
                    className="max-w-5xl mx-auto"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                    >
                        <span className="inline-block px-4 py-1.5 mb-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase border border-slate-200 dark:border-slate-700">
                            Smart Student Management
                        </span>
                    </motion.div>

                    <h1 className="text-3xl sm:text-5xl md:text-[5rem] font-black mb-6 sm:mb-10 tracking-tighter leading-[1.1] text-black dark:text-white text-center drop-shadow-sm dark:drop-shadow-none">
                        UniTrack helps you<br />
                        manage your<br />
                        <WordCycle isDark={isDark} />
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="mt-4 sm:mt-6 mb-8 sm:mb-12 text-base sm:text-lg md:text-xl max-w-2xl mx-auto text-slate-700 dark:text-slate-400 font-medium leading-relaxed px-2"
                    >
                        The ultimate student companion. Seamlessly track attendance, assignments, and everything in between with a futuristic, zero-clutter experience.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <div className="group relative p-px rounded-2xl bg-gradient-to-b from-slate-200 to-slate-400 dark:from-white/30 dark:to-white/10 hover:shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all duration-500">
                            <button
                                onClick={() => navigate("/signup")}
                                className="relative px-6 sm:px-10 py-4 sm:py-5 bg-white dark:bg-neutral-950 rounded-[0.9rem] flex items-center gap-3 transition-colors group-hover:bg-slate-50 dark:group-hover:bg-neutral-900"
                            >
                                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">Start Managing</span>
                                <ArrowRight className="h-5 w-5 text-brand dark:text-white group-hover:translate-x-1 transition-transform duration-300" />
                            </button>
                        </div>
                        
                        <button
                            onClick={() => navigate("/login")}
                            className="px-6 sm:px-10 py-4 sm:py-5 rounded-2xl text-slate-500 dark:text-slate-400 font-bold hover:text-brand dark:hover:text-white transition-colors"
                        >
                            Log in to dashboard
                        </button>
                    </motion.div>
                </motion.div>
            </main>

            {/* Footer / Info */}
            <footer className="relative z-10 p-10 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-12 h-px bg-slate-200 dark:bg-slate-700" />
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-slate-500 dark:text-slate-200">
                    Built for the next generation of students
                </p>
            </footer>
        </div>
    );
}
