import { motion } from "motion/react";
import { OnboardingData } from "../onboarding-env";

export function StepIdentity({ 
  data, 
  updateData, 
  onNext 
}: { 
  data: OnboardingData;
  updateData: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
}) {
  const isComplete = data.name.trim().length > 0;

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto mt-12">
      <motion.span 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-12"
      >
        STEP 1: IDENTITY
      </motion.span>
      
      <div className="flex flex-col gap-10">
        <motion.label 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-3"
        >
          <span className="text-body-strong font-bold text-ink-v2">Full Name</span>
          <input 
            type="text" 
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            className="px-4 py-4 bg-surface-v2 border border-line focus:border-ink-v2 outline-none text-ink-v2 text-body-v2 transition-colors"
            placeholder="Student Name"
            autoFocus
          />
        </motion.label>

        <motion.label 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-4"
        >
          <span className="text-body-strong font-bold text-ink-v2">Attendance Target Margin</span>
          <div className="flex items-center gap-6">
            <input 
              type="range" 
              min="0" max="100" 
              value={data.globalTarget}
              onChange={(e) => updateData({ globalTarget: Number(e.target.value) })}
              className="flex-1 accent-ink-v2 h-1 bg-line rounded-none appearance-none cursor-pointer"
            />
            <span className="text-[1.75rem] font-bold tabular-nums text-ink-v2 min-w-[3.5rem] text-right" style={{ fontFamily: "var(--font-data)" }}>
              {data.globalTarget}%
            </span>
          </div>
        </motion.label>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex justify-end mt-16"
      >
        <button 
          onClick={onNext}
          disabled={!isComplete}
          className="px-8 py-4 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase disabled:opacity-50 transition-opacity"
        >
          CONTINUE
        </button>
      </motion.div>
    </div>
  );
}
