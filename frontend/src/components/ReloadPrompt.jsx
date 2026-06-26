import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

/**
 * ReloadPrompt
 *
 * Shows a non-intrusive toast when a new service worker is available.
 * The user can choose to update immediately or dismiss.
 * Positioned above the mobile bottom nav bar on small screens.
 */
export default function ReloadPrompt() {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every 60 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const show = needRefresh && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9998] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-brand/10 dark:bg-brand-500/20 flex-shrink-0">
              <RefreshCw className="h-5 w-5 text-brand dark:text-slate-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                New version available
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update to get the latest features and fixes.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-sm"
                >
                  Update now
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
