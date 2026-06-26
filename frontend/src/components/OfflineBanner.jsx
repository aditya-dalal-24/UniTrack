import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';
import useNetworkStatus from '../hooks/useNetworkStatus';

export default function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const [syncCompleted, setSyncCompleted] = useState(false);

  useEffect(() => {
    const handleSyncStart = (e) => {
      setIsSyncing(true);
      setSyncCount(e.detail.count);
      setSyncCompleted(false);
    };

    const handleSyncComplete = (e) => {
      setIsSyncing(false);
      setSyncCount(e.detail.count);
      setSyncCompleted(true);
      
      // Clear the completion message after a few seconds
      setTimeout(() => {
        setSyncCompleted(false);
      }, 3000);
    };

    window.addEventListener('offline-sync-started', handleSyncStart);
    window.addEventListener('offline-sync-completed', handleSyncComplete);

    return () => {
      window.removeEventListener('offline-sync-started', handleSyncStart);
      window.removeEventListener('offline-sync-completed', handleSyncComplete);
    };
  }, []);

  // Show if currently offline, if we just came back online, or if syncing
  const show = !isOnline || wasOffline || isSyncing || syncCompleted;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex justify-center p-2 pointer-events-none"
        >
          <div 
            className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border text-sm font-medium transition-colors ${
              !isOnline 
                ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-300'
                : isSyncing
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span>You are currently offline</span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Syncing {syncCount} pending changes...</span>
              </>
            ) : syncCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Successfully synced {syncCount} items!</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Back online!</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
