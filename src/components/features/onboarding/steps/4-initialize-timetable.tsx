import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { resolveBatch } from "@/lib/timetable/core";
import { Subject, TimetableSlot } from "@/domain/models";

const STAGES = [
  "Resolving Batch",
  "Loading Subjects",
  "Assigning Faculty",
  "Generating Weekly Structure",
  "Building Timetable"
];

export function StepInitializeTimetable({ 
  batchId,
  onComplete
}: { 
  batchId: string;
  onComplete: (subjects: Subject[], slots: TimetableSlot[]) => void;
}) {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    // Simulate computational delay for the editorial effect
    const totalStages = STAGES.length;
    let stage = 0;
    
    const interval = setInterval(() => {
      stage++;
      setCurrentStage(stage);
      
      if (stage >= totalStages) {
        clearInterval(interval);
        // Do the actual resolution
        setTimeout(() => {
          const { subjects, slots } = resolveBatch(batchId);
          onComplete(subjects, slots);
        }, 800);
      }
    }, 700);

    return () => clearInterval(interval);
  }, [batchId, onComplete]);

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto mt-12 min-h-[50vh] justify-center">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
        }}
        className="flex flex-col gap-4 font-mono text-meta tracking-[0.1em] uppercase"
      >
        {STAGES.map((stage, idx) => {
          const isProcessing = currentStage === idx;
          const isDone = currentStage > idx;
          const isPending = currentStage < idx;

          return (
            <motion.div 
              key={stage}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { ease: [0.22, 1, 0.36, 1], duration: 0.4 } }
              }}
              className={`flex items-center gap-4 transition-colors duration-300 ${
                isPending ? 'text-ink-tertiary/30' : isProcessing ? 'text-ink-v2' : 'text-ink-tertiary'
              }`}
            >
              <span className="w-8 text-right opacity-50">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span>{stage}</span>
              {isProcessing && (
                <motion.span 
                  animate={{ opacity: [1, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-2 h-4 bg-ink-v2 ml-2"
                />
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
