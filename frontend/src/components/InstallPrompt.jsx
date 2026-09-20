import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';
import useInstallPrompt from '../hooks/useInstallPrompt';

const DISMISS_KEY = 'unitrack_pwa_install_dismissed_at';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function InstallPrompt() {
  const { canInstall, promptInstall, isInstalled, isIOS } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  // Check if user previously dismissed the prompt (within the last 7 days)
  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY));
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION_MS) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setDismissed(true);
    }
  };

  // iOS never fires beforeinstallprompt, so canInstall is never true there —
  // show manual "Add to Home Screen" instructions instead of a native button.
  const show = (canInstall || isIOS) && !isInstalled && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-24 md:bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[9990] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-brand/10 dark:bg-brand-500/20 flex-shrink-0">
              <Download className="h-5 w-5 text-brand dark:text-slate-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Install UniTrack
              </p>
              {canInstall ? (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Add to your home screen for quick access and offline support.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleInstall}
                      className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-sm"
                    >
                      Install App
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      Not now
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center flex-wrap gap-1">
                    Tap <Share className="h-3.5 w-3.5 inline-block flex-shrink-0" /> Share, then "Add to Home Screen".
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleDismiss}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      Got it
                    </button>
                  </div>
                </>
              )}
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
