import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { resolveBatch } from "@/lib/timetable/core";
import { Subject, TimetableSlot } from "@/domain/models";

const STAGES = [
  "Resolving Batch",
  "Loading Subjects",
  "Assigning Faculty",
  "Generating Structure",
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
    const totalStages = STAGES.length;
    let stage = 0;
    
    const interval = setInterval(() => {
      stage++;
      setCurrentStage(stage);
      
      if (stage >= totalStages) {
        clearInterval(interval);
        setTimeout(() => {
          const { subjects, slots } = resolveBatch(batchId);
          onComplete(subjects, slots);
        }, 800);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [batchId, onComplete]);

  return (
    <div className="flex flex-col w-full h-[60vh] justify-center items-center px-6">
      <div className="flex flex-col gap-6 w-full max-w-sm">
        {STAGES.map((stage, idx) => {
          const isActive = currentStage === idx;
          const isDone = currentStage > idx;
          const isPending = currentStage < idx;

          return (
            <motion.div 
              key={stage}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`flex items-center justify-between border-b pb-4 transition-colors duration-700 ${
                isActive ? "border-ink-v2" : "border-line"
              }`}
            >
              <div className="flex items-center gap-5">
                 <span 
                   className={`text-meta font-bold tabular-nums transition-colors duration-700 ${
                     isActive ? "text-presynce" : isDone ? "text-ink-secondary" : "text-ink-tertiary/30"
                   }`}
                   style={{ fontFamily: "var(--font-data)" }}
                 >
                   {String(idx + 1).padStart(2, '0')}
                 </span>
                 <span 
                   className={`text-micro font-bold tracking-[0.16em] uppercase transition-colors duration-700 ${
                     isActive ? "text-ink-v2" : isDone ? "text-ink-secondary" : "text-ink-tertiary/40"
                   }`}
                 >
                   {stage}
                 </span>
              </div>
              
              <div className="w-3 h-3 flex items-center justify-center shrink-0">
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="w-2 h-2 bg-presynce rounded-full"
                    animate={{ scale: [1, 1.8, 1], opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  />
                )}
                {isDone && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-1.5 h-1.5 bg-ink-v2 rounded-full opacity-20" 
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
