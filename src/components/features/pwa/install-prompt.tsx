"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download } from "lucide-react";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIosManual, setIsIosManual] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.log('SW registration failed: ', err));
    }
    if (typeof window === "undefined") return;

    if (window.matchMedia("(display-mode: standalone)").matches || ('standalone' in window.navigator && (window.navigator as any).standalone)) {
      return;
    }

    const dismissedAt = localStorage.getItem("presynce_pwa_dismissed");
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (days < 7) return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    if (isIos && !dismissedAt) {
        setIsIosManual(true);
        setTimeout(() => setShow(true), 1500);
    } else {
        setTimeout(() => setShow(true), 1500);
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

  if (!show || (!deferredPrompt && !isIosManual)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-[400px] bg-paper text-ink border border-line shadow-2xl p-6 z-50 rounded-none"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 text-ink-tertiary hover:text-ink transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-presynce-soft flex items-center justify-center shrink-0 border border-presynce/20">
            <Download className="w-6 h-6 text-presynce" />
          </div>
          <div className="flex flex-col pt-0.5 pr-6">
            <h3 className="font-bold text-body-strong leading-tight">Add Presynce to your Home Screen</h3>
            <p className="text-meta text-ink-secondary mt-1.5 leading-relaxed">
              Get faster access to your attendance, timetable and daily classes.
            </p>
          </div>
        </div>

        {isIosManual && !deferredPrompt ? (
          <div className="bg-surface p-4 text-meta text-ink-secondary border border-line leading-relaxed">
            Tap the <span className="font-bold text-ink">Share</span> button at the bottom of Safari, then select <span className="font-bold text-ink">Add to Home Screen</span>.
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full bg-presynce text-white py-4 font-bold text-micro tracking-[0.14em] uppercase hover:bg-presynce-hover transition-colors shadow-sm"
          >
            Add to Home Screen
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
