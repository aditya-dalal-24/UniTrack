import { motion } from "framer-motion";
import { WifiOff, RotateCcw } from "lucide-react";
import useNetworkStatus from "../hooks/useNetworkStatus";

export default function OfflineFallback() {
  const { isOnline } = useNetworkStatus();

  // If we came back online while on this page, immediately reload to clear the fallback
  if (isOnline) {
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-black text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full flex flex-col items-center"
      >
        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-6 border-4 border-white dark:border-slate-950 shadow-xl">
          <WifiOff className="h-10 w-10 text-slate-400" />
        </div>
        
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
          You're offline
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          It looks like you've lost your internet connection. We couldn't load this page from the cache. Check your connection and try again.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand/20"
        >
          <RotateCcw className="h-5 w-5" />
          Try Again
        </button>
      </motion.div>
    </div>
  );
}
