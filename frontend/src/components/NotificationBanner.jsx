import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X } from 'lucide-react';
import useNotificationScheduler from '../hooks/useNotificationScheduler';

export default function NotificationBanner() {
  const { permission, requestPermission } = useNotificationScheduler();
  const [dismissed, setDismissed] = useState(
    localStorage.getItem('notificationBannerDismissed') === 'true'
  );

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted || !granted) {
      // Regardless of outcome, hide the banner after they interact
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('notificationBannerDismissed', 'true');
  };

  const show = permission === 'default' && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[28rem] z-[9999] bg-brand text-white p-3 px-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <BellRing className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Class Reminders</p>
              <p className="text-xs text-brand-50 mt-0.5">Enable notifications to never miss a lecture.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnable}
              className="px-3 py-1.5 bg-white text-brand text-xs font-bold rounded-lg hover:scale-105 active:scale-95 transition-all shadow-sm whitespace-nowrap"
            >
              Enable
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-white/70 hover:bg-white/20 hover:text-white rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
