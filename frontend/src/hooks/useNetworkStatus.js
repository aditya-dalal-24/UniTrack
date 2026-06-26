import { useState, useEffect } from 'react';

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    let timeoutId;

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      
      // Clear the "wasOffline" state after a few seconds
      // so we can hide the "Back online" toast
      timeoutId = setTimeout(() => {
        setWasOffline(false);
      }, 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
      if (timeoutId) clearTimeout(timeoutId);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return { isOnline, wasOffline };
}
