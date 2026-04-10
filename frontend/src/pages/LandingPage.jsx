import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, ArrowRight, LayoutDashboard, Calendar, ClipboardCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-6 lg:px-8 mx-auto max-w-7xl" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link to="/" className="-m-1.5 p-1.5 flex items-center gap-2 text-brand dark:text-brand-400">
              <GraduationCap className="h-8 w-8" />
              <span className="font-bold text-2xl tracking-tight">UNITRACK</span>
            </Link>
          </div>
          <div className="flex flex-1 justify-end items-center gap-6">
            <Link to="/login" className="text-sm font-semibold leading-6 hover:text-brand transition-colors">
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand transition-all"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="relative isolate flex-1 flex flex-col justify-center pt-14">
        {/* Background Gradients */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#9333ea] to-[#4f46e5] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 flex justify-center"
          >
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-slate-600 dark:text-slate-400 ring-1 ring-slate-900/10 dark:ring-white/10 hover:ring-slate-900/20">
              Announcing our next generation academic platform. <Link to="/signup" className="font-semibold text-brand"><span className="absolute inset-0" aria-hidden="true"></span>Read more <span aria-hidden="true">&rarr;</span></Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-slate-900 dark:text-white leading-tight">
              Manage your academic journey with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-purple-600">UNITRACK</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
              The ultimate student management system. Seamlessly track attendance, organize timetables, monitor expenses, and keep an eye on your marks all in one beautifully crafted platform.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/signup"
                className="rounded-full bg-brand px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand transition-all flex items-center gap-2"
              >
                Get started <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="text-sm font-semibold leading-6 text-slate-900 dark:text-white hover:text-brand transition-colors">
                Log in to dashboard <span aria-hidden="true">→</span>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Feature Highlights */}
        <motion.div 
           initial={{ opacity: 0, y: 40 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.4 }}
           className="px-6 py-10 lg:px-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 w-full"
        >
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="h-12 w-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mb-4">
                    <Calendar size={24} />
                </div>
                <h3 className="text-lg font-bold mb-2">Smart Timetables</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Keep track of your classes, exams, and labs with intuitive timeline views and scheduling systems.</p>
            </div>
            
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="h-12 w-12 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-4">
                    <ClipboardCheck size={24} />
                </div>
                <h3 className="text-lg font-bold mb-2">Attendance Tracking</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Never drop below limits. Log presences effortlessly, manage holidays, and receive real-time analytics.</p>
            </div>

            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="h-12 w-12 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4">
                    <LayoutDashboard size={24} />
                </div>
                <h3 className="text-lg font-bold mb-2">Centralized Dashboard</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Have a birds-eye view of your expenses, grades, tasks, and profile updates straight from the homepage.</p>
            </div>
        </motion.div>

        {/* Bottom Gradient */}
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
        </div>
      </div>
    </div>
  );
}
