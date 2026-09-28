import { motion } from "motion/react";
import { OnboardingData } from "../onboarding-env";
import { TIMETABLES, SUBJECTS } from "@/lib/timetable/data";

export function StepBatchSelection({ 
  data, 
  updateData, 
  onNext 
}: { 
  data: OnboardingData;
  updateData: (d: Partial<OnboardingData>) => void;
  onNext: () => void;
}) {
  const batches = Object.keys(TIMETABLES);

  const getMetadata = (batchId: string) => {
    const days = TIMETABLES[batchId];
    let subjectCount = 0;
    let labCount = 0;
    const uniqueSubjects = new Set<string>();

    Object.values(days).forEach(entries => {
      entries.forEach(e => {
        uniqueSubjects.add(e.subject);
        if (e.isLab) labCount++;
      });
    });

    subjectCount = uniqueSubjects.size;
    return { subjectCount, labCount };
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto mt-12">
      <motion.span 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-12"
      >
        STEP 2: BATCH SELECTION
      </motion.span>
      
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
          }
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {batches.map(batchId => {
          const isSelected = data.batchId === batchId;
          const { subjectCount, labCount } = getMetadata(batchId);

          return (
            <motion.button
              key={batchId}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0, transition: { ease: [0.22, 1, 0.36, 1], duration: 0.6 } }
              }}
              onClick={() => updateData({ batchId })}
              className={`flex flex-col text-left p-6 border transition-colors ${
                isSelected 
                  ? 'border-ink-v2 bg-surface-v2' 
                  : 'border-line bg-paper hover:border-ink-secondary'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="font-bold text-ink-v2 text-body-strong">CSE 3 {batchId}</span>
                {isSelected && (
                  <span className="text-micro font-bold text-ink-v2 tracking-widest">SELECTED</span>
                )}
              </div>
              <div className="flex gap-4 text-micro text-ink-secondary">
                <span>{subjectCount} Subjects</span>
                <span>•</span>
                <span>{labCount} Labs</span>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex justify-end mt-16"
      >
        <button 
          onClick={onNext}
          disabled={!data.batchId}
          className="px-8 py-4 bg-ink-v2 text-paper text-micro font-bold tracking-[0.14em] uppercase disabled:opacity-50 transition-opacity"
        >
          CONTINUE
        </button>
      </motion.div>
    </div>
  );
}
