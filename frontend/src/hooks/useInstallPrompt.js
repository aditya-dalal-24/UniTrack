import { useState, useEffect } from 'react';

// iOS Safari (and other iOS browsers, which all use WebKit's install flow)
// never fires `beforeinstallprompt` — there is no native install prompt to
// hook into. Detected once at module load since the UA doesn't change at runtime.
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  // iPadOS 13+ reports as "MacIntel" but has touch support, unlike a real Mac.
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || navigator.standalone
      || document.referrer.includes('android-app://');
    
    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      return false;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setCanInstall(false);
    
    return outcome === 'accepted';
  };

  return { canInstall, promptInstall, isInstalled, isIOS };
}
