"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIosManual, setIsIosManual] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.log('SW registration failed: ', err));
    }
    if (typeof window === "undefined") return;

    // Hide if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches || ('standalone' in window.navigator && (window.navigator as any).standalone)) {
      return;
    }

    // Hide if dismissed recently (e.g. 7 days)
    const dismissedAt = localStorage.getItem("presynce_pwa_dismissed");
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < 7) return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS manual prompt detection
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    if (isIos && !dismissedAt) {
        setIsIosManual(true);
        setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem("presynce_pwa_dismissed", Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-ink-v2 text-paper p-4 flex items-center justify-between gap-4 z-50 shadow-xl border-t-2 border-presynce"
      >
        <div className="flex flex-col">
          <span className="font-bold text-meta tracking-[0.14em] uppercase text-presynce-soft">Install Presynce</span>
          <span className="text-micro opacity-80 mt-1 leading-relaxed">
            {isIosManual && !deferredPrompt 
              ? "Tap Share → Add to Home Screen for the full app experience." 
              : "Add to Home Screen for the full app experience."}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isIosManual || deferredPrompt ? (
            <button
              onClick={handleInstall}
              className="bg-presynce text-white px-3 py-2 font-bold text-micro tracking-widest uppercase hover:bg-presynce-hover transition-colors whitespace-nowrap"
            >
              Install
            </button>
          ) : null}
          <button
            onClick={handleDismiss}
            className="p-2 text-paper/60 hover:text-paper transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

