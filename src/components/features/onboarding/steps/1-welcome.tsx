import { motion } from "motion/react";

export function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col min-h-[60vh] max-w-2xl mx-auto items-center justify-center text-center">
      <motion.h1 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="font-bold tracking-tighter text-ink-v2 leading-[0.85] mb-8" 
        style={{ fontSize: "clamp(3rem, 6vw, 5rem)", fontFamily: "var(--font-display)" }}
      >
        Everything starts<br/>with your timetable.
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="text-body-v2 text-ink-secondary mb-16 max-w-sm"
      >
        Let&apos;s build your academic workspace.
      </motion.p>
      
      <motion.button 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={onNext} 
        className="px-8 py-4 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        INITIALIZE
      </motion.button>
    </div>
  );
}
