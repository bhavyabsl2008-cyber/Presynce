"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { PageShell } from "@/components/layout/v2/page-shell";
import { TRANSITION_PAGE } from "@/lib/motion";
import { Subject, TimetableSlot } from "@/domain/models";
import { ChalkpadBridgePayload } from "@/services/sync/types";
import { matchSubject } from "@/services/sync/chalkpad-adapter";

// Step Components
import { StepWelcome } from "./steps/1-welcome";
import { StepIdentity } from "./steps/2-identity";
import { StepBatchSelection } from "./steps/3-batch-selection";
import { StepInitializeTimetable } from "./steps/4-initialize-timetable";
import { StepChalkpadSync } from "./steps/5-chalkpad-sync";

export type OnboardingData = {
  name: string;
  globalTarget: number;
  batchId: string | null;
  subjects: Subject[];
  slots: TimetableSlot[];
};

const STEPS = [
  "welcome",
  "identity",
  "batch",
  "init-timetable",
  "sync",
] as const;

type Step = typeof STEPS[number];

export function OnboardingEnv() {
  const router = useRouter();
  const setStudent = useStore((state) => state.setStudent);
  const addSubject = useStore((state) => state.addSubject);
  const addSlot = useStore((state) => state.addSlot);

  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [data, setData] = useState<OnboardingData>({
    name: "",
    globalTarget: 75,
    batchId: null,
    subjects: [],
    slots: [],
  });

  const updateData = (newData: Partial<OnboardingData>) => {
    setData((d) => ({ ...d, ...newData }));
  };

  const advanceTo = (step: Step) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinish = (records: import('./steps/5-chalkpad-sync').ChalkpadSyncRecord[]) => {
    const { clearAll, mergeSubjectAttendance } = useStore.getState();
    clearAll(); // Clears any existing data to prevent duplicates if onboarding is re-run

    // 1. Save Identity
    setStudent({
      name: data.name,
      university: "Chitkara University",
      branch: "Computer Science Engineering",
      semester: "Semester 3",
      globalTarget: data.globalTarget,
      isOnboarded: true,
      activeBatchId: data.batchId,
    });

    // 2. Save Timetable
    data.subjects.forEach((s) => addSubject(s));
    data.slots.forEach((s) => addSlot(s));

    // 3. Save Baseline Attendance from Chalkpad sync records.
    const today = new Date().toISOString().split("T")[0];
    records.forEach((record) => {
      if (record.isStandalone) {
        // Create the standalone subject in the store so the attendance has a valid parent
        addSubject(record.matchedSubject);
      }
      
      mergeSubjectAttendance(
        record.matchedSubject.id,
        record.attended,
        record.dl,
        record.payload.ml ?? 0,
        record.delivered,
        today,            // lastUpdated = local write time
        "Chalkpad",
        record.payload.dataAsOf || today  // dataAsOf = source freshness
      );
    });

    router.push("/semester/dataset");
  };

  return (
    <PageShell>
      <div className="flex-1 flex flex-col px-8 lg:px-12 py-12">
        <AnimatePresence mode="wait">
          {currentStep === "welcome" && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={TRANSITION_PAGE}>
              <StepWelcome onNext={() => advanceTo("identity")} />
            </motion.div>
          )}

          {currentStep === "identity" && (
            <motion.div key="identity" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={TRANSITION_PAGE}>
              <StepIdentity data={data} updateData={updateData} onNext={() => advanceTo("batch")} />
            </motion.div>
          )}

          {currentStep === "batch" && (
            <motion.div key="batch" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={TRANSITION_PAGE}>
              <StepBatchSelection data={data} updateData={updateData} onNext={() => advanceTo("init-timetable")} />
            </motion.div>
          )}

          {currentStep === "init-timetable" && data.batchId && (
            <motion.div key="init-timetable" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION_PAGE}>
              <StepInitializeTimetable
                batchId={data.batchId}
                onComplete={(subjects, slots) => {
                  updateData({ subjects, slots });
                  advanceTo("sync");
                }}
              />
            </motion.div>
          )}

          {currentStep === "sync" && (
            <motion.div key="sync" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={TRANSITION_PAGE}>
              <StepChalkpadSync
                subjects={data.subjects}
                onComplete={handleFinish}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}

