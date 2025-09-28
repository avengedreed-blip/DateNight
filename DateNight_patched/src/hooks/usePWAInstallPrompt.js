import { useState, useEffect, useCallback } from "react";

/**
 * usePWAInstallPrompt listens for the browser's beforeinstallprompt event
 * and exposes a method to trigger the install prompt. When supported,
 * deferredPrompt will be non-null and promptInstall() will show the
 * native install dialog. After the user responds, deferredPrompt is reset.
 */
export default function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    try {
      const choice = await deferredPrompt.userChoice;
      // Reset the deferred prompt whether accepted or dismissed
      setDeferredPrompt(null);
      return choice;
    } catch (error) {
      setDeferredPrompt(null);
      return null;
    }
  }, [deferredPrompt]);

  return { deferredPrompt, promptInstall };
}