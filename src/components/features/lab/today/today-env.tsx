"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "motion/react";
import { computeAttendanceReading } from "@/domain/attendance";
import { type AttendanceSnapshot } from "@/domain/models";
import { PageShell } from "@/components/layout/v2/page-shell";
import { useStore } from "@/store";

// ─── Motion Tokens ────────────────────────────────────────────────────────────
const SPRING = {
  SNAP: { type: "spring" as const, stiffness: 500, damping: 35, mass: 0.8 },
  MOVE: { type: "spring" as const, stiffness: 320, damping: 30, mass: 1 },
  SOFT: { type: "spring" as const, stiffness: 200, damping: 28, mass: 1 },
};

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Types & Hooks ────────────────────────────────────────────────────────────
import { type ClassState, type HoverAction, type TodaySubject } from "@/domain/types";
import { type AttendanceStatus } from "@/domain/attendance";
import { useTodaySchedule } from "@/hooks/useTodaySchedule";


// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

function statusColor(status: AttendanceStatus): string {
  if (status === "danger") return "var(--color-danger)";
  if (status === "warn") return "var(--color-caution)";
  if (status === "unknown") return "var(--color-ink-tertiary)";
  return "var(--color-safe)";
}

function statusClass(status: AttendanceStatus): string {
  if (status === "danger") return "text-danger";
  if (status === "warn") return "text-caution";
  if (status === "unknown") return "text-ink-tertiary";
  return "text-safe";
}

function statusLabel(reading: ReturnType<typeof computeAttendanceReading>): string {
  if (reading.status === "danger") {
    return `NEEDS ${String(reading.classesToRecover).padStart(2, "0")}`;
  }
  return `CAN STILL MISS ${String(reading.canStillMiss).padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Semantic attendance status badge */
function SemanticStatus({
  reading,
  size = "default",
}: {
  reading: ReturnType<typeof computeAttendanceReading>;
  size?: "small" | "default" | "large";
}) {
  const label = statusLabel(reading);
  const colorClass = statusClass(reading.status);
  const sizeClass =
    size === "large"
      ? "text-section-title font-bold tracking-tight"
      : size === "small"
      ? "text-micro font-bold tracking-[0.12em] uppercase"
      : "text-meta font-bold tracking-[0.1em] uppercase";

  return (
    <span className={`${colorClass} ${sizeClass} tabular-nums`}
      style={{ fontFamily: "var(--font-data)" }}>
      {label}
    </span>
  );
}

/** Timeline rail with Lab A node grammar: ● ◉ ◌ ○ */
function DayTimeline({ subjects, onSelectSubject }: { subjects: TodaySubject[], onSelectSubject: (id: string) => void }) {
  const shouldReduce = useReducedMotion();

  return (
    <div
      className="w-full overflow-x-auto no-scrollbar"
      role="list"
      aria-label="Today's schedule"
    >
      <div
        className="relative flex items-start justify-between w-full min-w-max py-4"
      >
        {/* Rail line (38px from top of item = 16px top padding + 16px time height + 12px margin + 10px half-node - wait, padding is on container) */}
        {/* If container has py-4 (16px), time has h-4 (16px), mb-3 (12px), node half is 10px. 
            Total offset from container top = 16 + 16 + 12 + 10 = 54px. */}
        <div
          className="absolute left-0 right-0"
          style={{ top: "54px", height: "1px", background: "var(--color-line)" }}
          aria-hidden
        />

        {subjects.map((sub) => {
          const isResolved = sub.state === "resolved";
          const isCurrent = sub.state === "current";
          const isUnresolved = sub.state === "unresolved";
          const isUpcoming = sub.state === "upcoming";

          return (
            <div
              key={sub.id}
              role="listitem"
              onClick={() => onSelectSubject(sub.id)}
              className="flex-1 flex flex-col items-center relative px-2 min-w-[72px] md:min-w-[96px] max-w-[120px] cursor-pointer"
              style={{ zIndex: 1 }}
              aria-label={`${sub.time} — ${sub.subject} (${sub.state})`}
            >
              {/* Time */}
              <div className="h-4 flex items-end justify-center mb-3">
                <span className="text-[0.65rem] font-bold tabular-nums text-ink-secondary tracking-[0.08em] leading-none"
                  style={{ fontFamily: "var(--font-data)" }}>
                  {sub.time}
                </span>
              </div>

              {/* Node */}
              <div className="relative flex items-center justify-center shrink-0" style={{ width: "20px", height: "20px" }}>
                {isCurrent && (
                  <>
                    {!shouldReduce && (
                      <motion.div
                        className="absolute rounded-full"
                        style={{ border: "1px solid var(--color-presynce)", width: "20px", height: "20px" }}
                        animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                    <div style={{
                      width: "12px", height: "12px", borderRadius: "50%",
                      background: "var(--color-ink-v2)",
                      boxShadow: "0 0 0 2.5px var(--color-paper), 0 0 0 4.5px var(--color-presynce)",
                    }} />
                  </>
                )}
                {isResolved && (
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-ink-v2)" }} />
                )}
                {isUnresolved && (
                  <motion.div
                    animate={!shouldReduce ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      width: "10px", height: "10px", borderRadius: "50%",
                      border: "1.5px dashed var(--color-danger)",
                      background: "var(--color-paper)",
                    }}
                  />
                )}
                {isUpcoming && (
                  <div style={{
                    width: "7px", height: "7px", borderRadius: "50%",
                    border: "1.5px solid var(--color-ink-tertiary)",
                    background: "var(--color-paper)",
                  }} />
                )}
              </div>

              {/* Subject Label */}
              <span
                className="text-[0.65rem] font-bold tracking-[0.1em] uppercase text-center mt-3 leading-tight line-clamp-2"
                style={{
                  color: isCurrent
                    ? "var(--color-presynce)"
                    : isUnresolved
                    ? "var(--color-danger)"
                    : isResolved
                    ? "var(--color-ink-secondary)"
                    : "var(--color-ink-tertiary)",
                }}
              >
                {sub.subject}
              </span>

              {/* Status Label */}
              <span
                className={`text-[0.55rem] font-bold tracking-[0.12em] uppercase mt-1 ${
                  isCurrent
                    ? "text-presynce"
                    : isUnresolved
                    ? "text-danger"
                    : isResolved
                    ? "text-ink-tertiary"
                    : "text-ink-tertiary/50"
                }`}
              >
                {isCurrent
                    ? "NOW"
                  : isResolved
                    ? "DONE"
                  : isUnresolved
                    ? "LOG"
                  : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Physical threshold rail with projection system */
function ThresholdRail({
  snapshot,
  hoverAction,
  remainingClasses = 0,
}: {
  snapshot: AttendanceSnapshot | null;
  hoverAction: HoverAction;
  remainingClasses?: number;
}) {
  const shouldReduce = useReducedMotion();
  const { student } = useStore();

  const current = computeAttendanceReading(snapshot, remainingClasses);
  const targetSnap = snapshot ? { ...snapshot, threshold: snapshot.threshold } : null;
  const attendSnap = snapshot ? { ...snapshot, effectiveAttended: snapshot.effectiveAttended + 1, held: snapshot.held + 1 } : null;
  const skipSnap = snapshot ? { ...snapshot, held: snapshot.held + 1 } : null;
  const attendReading = computeAttendanceReading(attendSnap, Math.max(0, remainingClasses - 1));
  const skipReading = computeAttendanceReading(skipSnap, Math.max(0, remainingClasses - 1));

  const currentPct = clamp(current.percentage, 5, 95);
  const projectedReading = hoverAction === "attend" ? attendReading : hoverAction === "skip" ? skipReading : null;
  const projectedPct = projectedReading ? clamp(projectedReading.percentage, 5, 95) : null;
  const targetPct = snapshot ? snapshot.threshold : (student?.globalTarget?? 75);

  const crossesThreshold =
    snapshot !== null && projectedReading !== null &&
    ((current.percentage >= snapshot.threshold && projectedReading.percentage < snapshot.threshold) ||
      (current.percentage < snapshot.threshold && projectedReading.percentage >= snapshot.threshold));

  const ghostColor = projectedReading ? statusColor(projectedReading.status) : "transparent";
  const markerColor = crossesThreshold ? "var(--color-danger)" : "var(--color-ink-v2)";

  const nodeTransition = shouldReduce ? { duration: 0.01 } : SPRING.MOVE;
  const fadeTransition = shouldReduce ? { duration: 0.01 } : { duration: 0.14, ease: EASE };

  return (
    <div className="relative w-full" style={{ height: "56px" }} aria-hidden>
      {/* TARGET label */}
      <div
        className="absolute text-[0.6rem] font-bold tracking-[0.16em] uppercase text-ink-secondary"
        style={{
          left: `${targetPct}%`, top: "0px",
          transform: "translateX(-50%)", whiteSpace: "nowrap",
          fontFamily: "var(--font-data)",
        }}
      >
        {snapshot ? `${snapshot.threshold}%` : "SYNCING"}
      </div>

      {/* Rail axis */}
      <div
        className="absolute left-0 right-0"
        style={{ top: "34px", height: "1px", background: "var(--color-line)" }}
      />

      {/* Threshold marker — vertical tick */}
      <motion.div
        className="absolute"
        animate={{ background: markerColor }}
        transition={{ duration: 0.18, ease: EASE }}
        style={{
          left: `${targetPct}%`, top: "26px",
          width: "2px", height: "18px",
          transform: "translateX(-50%)",
        }}
      />

      {/* Ghost node — projected state */}
      <AnimatePresence>
        {hoverAction && projectedPct !== null && (
          <motion.div
            key={hoverAction}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.85, scale: 1, left: `${projectedPct}%` }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={crossesThreshold ? { ...fadeTransition, left: nodeTransition } : fadeTransition}
            className="absolute"
            style={{
              top: "26px", width: "12px", height: "12px",
              borderRadius: "50%",
              border: `1.5px dashed ${ghostColor}`,
              background: "var(--color-paper)",
              transform: "translate(-50%, -50%)",
              zIndex: 1,
            }}
          />
        )}
      </AnimatePresence>

      {/* Current node */}
      <motion.div
        animate={{ left: `${currentPct}%` }}
        transition={nodeTransition}
        className="absolute"
        style={{
          top: "26px", width: "10px", height: "10px",
          borderRadius: "50%",
          background: "var(--color-ink-v2)",
          boxShadow: "0 0 0 2.5px var(--color-paper)",
          transform: "translate(-50%, -50%)",
          zIndex: 2,
        }}
      />

      {/* Projected % label */}
      <AnimatePresence>
        {projectedPct !== null && projectedReading && (
          <motion.div
            key={`label-${hoverAction}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
            className="absolute text-[0.6rem] font-bold tabular-nums"
            style={{
              left: `${projectedPct}%`, bottom: "0px",
              transform: "translateX(-50%)", whiteSpace: "nowrap",
              color: ghostColor,
              fontFamily: "var(--font-data)",
            }}
          >
            {projectedReading.percentage.toFixed(1)}%
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** One decision row — IF YOU ATTEND / IF YOU SKIP */
function DecisionRow({
  action,
  snapshot,
  isActive,
  onActivate,
  onDeactivate,
  onCommit,
  remainingClasses = 0,
}: {
  action: "attend" | "skip" | "cancel" | "dl";
  snapshot: AttendanceSnapshot | null;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onCommit: () => void;
  remainingClasses?: number;
}) {
  const shouldReduce = useReducedMotion();
  const isAttend = action === "attend";
  const isSkip = action === "skip";
  const isCancel = action === "cancel";
  const isDl = action === "dl";

  const targetSnap = snapshot ? (isAttend
      ? { ...snapshot, effectiveAttended: snapshot.effectiveAttended + 1, held: snapshot.held + 1 }
    : isSkip
      ? { ...snapshot, held: snapshot.held + 1 }
    : isDl
      ? { ...snapshot, effectiveAttended: snapshot.effectiveAttended + 1 }
    : { ...snapshot }) : null;

  const reading = computeAttendanceReading(targetSnap, Math.max(0, remainingClasses - 1));
    const label = isAttend ? "IF YOU ATTEND" : isSkip ? "IF YOU SKIP" : isDl ? "IF DUTY LEAVE" : "IF NOT HELD";
    const commitLabel = isAttend ? "PRESENT" : isSkip ? "ABSENT" : isDl ? "DUTY LEAVE" : "NOT HELD";
  const pct = snapshot ? reading.percentage.toFixed(1) : "--";

  const fieldTransition = shouldReduce ? { duration: 0.01 } : { duration: 0.14, ease: EASE };

  return (
    <div
      className="relative border-b border-line"
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
    >
      {/* Active field wash */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={fieldTransition}
        style={{ background: "var(--color-presynce-field)" }}
      />

      <div
        className="relative flex items-center justify-between py-3 gap-3"
        role="group"
        aria-label={`${label}: ${pct}%`}
      >
        {/* Left — consequence info */}
        <div
          className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 cursor-default"
          onFocus={onActivate}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && onDeactivate()}
        >
          <span
            className="text-micro font-bold tracking-[0.12em] uppercase text-ink-secondary shrink-0"
            style={{ width: "7rem" }}
          >
            {label}
          </span>
          <span className="text-ink-tertiary text-meta shrink-0" aria-hidden>&rarr;</span>
          <motion.span
            key={pct}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={fieldTransition}
            className="text-body-strong font-bold tabular-nums text-ink-v2 shrink-0"
            style={{ width: "3.75rem", fontFamily: "var(--font-data)" }}
          >
            {pct !== "--" ? `${pct}%` : pct}
          </motion.span>
          <span className="text-ink-tertiary text-meta shrink-0 hidden sm:inline" aria-hidden>&rarr;</span>
          <span className={`text-micro font-bold tracking-[0.12em] uppercase tabular-nums hidden sm:inline ${statusClass(reading.status)}`}
            style={{ fontFamily: "var(--font-data)" }}>
            {statusLabel(reading)}
          </span>
        </div>

        {/* Right — commit */}
        <motion.button
          whileTap={shouldReduce ? {} : { scale: 0.96 }}
          onClick={(e) => { e.stopPropagation(); onCommit(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCommit(); }
          }}
          className="shrink-0 px-4 py-2 text-micro font-bold tracking-[0.14em] uppercase
            transition-colors duration-100 outline-none"
          style={{
            background: isActive
              ? "var(--color-presynce)"
              : isAttend
              ? "var(--color-ink-v2)"
              : "transparent",
            color: isActive || isAttend ? "var(--color-paper)" : "var(--color-ink-v2)",
            border: isAttend && !isActive
              ? "none"
              : (!isAttend && !isCancel && !isActive)
              ? "1px solid var(--color-line-strong)"
              : isCancel
              ? "1px dashed var(--color-ink-tertiary)"
              : "none",
          }}
          aria-label={`Mark ${commitLabel} for this class`}
        >
          {commitLabel}
        </motion.button>
      </div>
    </div>
  );
}

/** Later Today — one compact row per upcoming subject */
function LaterTodayRow({ subject }: { subject: TodaySubject }) {
  const reading = computeAttendanceReading(subject.snapshot, subject.remainingClasses || 0);

  return (
    <div className="flex items-center justify-between py-3 gap-4
      hover:bg-surface-v2/60 transition-colors duration-100 -mx-3 px-3 group">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <span className="text-meta font-bold tabular-nums text-ink-secondary shrink-0 w-10"
          style={{ fontFamily: "var(--font-data)" }}>
          {subject.time}
        </span>
        <span className="text-body-strong font-bold text-ink-v2 truncate">
          {subject.subject}
        </span>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-body-strong font-bold tabular-nums text-ink-v2 w-12 text-right"
          style={{ fontFamily: "var(--font-data)" }}>
          {subject.snapshot ? `${reading.percentage.toFixed(1)}%` : "--"}
        </span>
        <SemanticStatus reading={reading} size="small" />
      </div>
    </div>
  );
}

// ─── Undo Toast ───────────────────────────────────────────────────────────────
function UndoToast({
  subjectName,
  onUndo,
}: {
  subjectName: string;
  onUndo: () => void;
}) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={shouldReduce ? { duration: 0.01 } : SPRING.SOFT}
      className="fixed z-50 flex items-center gap-4 px-5 py-3"
      style={{
        bottom: "calc(4rem + env(safe-area-inset-bottom, 0px) + 12px)",
        left: "50%", transform: "translateX(-50%)",
        background: "var(--color-ink-v2)",
        boxShadow: "0 8px 32px rgba(17,16,15,0.22)",
        whiteSpace: "nowrap",
      }}
      role="status"
      aria-live="polite"
    >
      <span className="text-meta font-bold text-paper/70 tabular-nums">
        Marked <strong className="text-paper">{subjectName}</strong>
      </span>
      <button
        onClick={onUndo}
        className="text-micro font-bold tracking-[0.14em] uppercase text-presynce-soft
          hover:text-paper transition-colors duration-100 underline underline-offset-2"
      >
        UNDO
      </button>
    </motion.div>
  );
}

// ─── Live Clock ─────────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).replace(/,/g, "").toUpperCase().replace(" ", " A ");
  const timeStr = now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

  return (
    <p className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mt-2"
      style={{ fontFamily: "var(--font-data)" }}>
      {dateStr} A {timeStr}
    </p>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function TodayEnv() {
  const { subjects, resolveClass, unresolveClass, isLoading } = useTodaySchedule();
  const { removeAttendance, records, student } = useStore();
  const [hoverAction, setHoverAction] = useState<HoverAction>(null);
  const [lastCommit, setLastCommit] = useState<TodaySubject | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const shouldReduce = useReducedMotion();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Derived
  const defaultCurrentClass = useMemo(() => subjects.find((s) => s.state === "current"), [subjects]);
  const unresolvedClass = useMemo(() => subjects.find((s) => s.state === "unresolved"), [subjects]);
  
  // The active class shown in the main panel. If a user clicks a subject in the timeline, it overrides the default current class.
  const currentClass = useMemo(() => {
    if (selectedSubjectId) {
      return subjects.find(s => s.id === selectedSubjectId) || defaultCurrentClass;
    }
    return defaultCurrentClass;
  }, [selectedSubjectId, defaultCurrentClass, subjects]);

  const upcomingClasses = useMemo(() => subjects.filter((s) => s.state === "upcoming"), [subjects]);
  const currentReading = useMemo(
    () => (currentClass && currentClass.snapshot) ? computeAttendanceReading(currentClass.snapshot, currentClass.remainingClasses || 0) : null,
    [currentClass]
  );

  // Day risk: how many upcoming subjects drop below threshold if all skipped
  const subjectsAtRisk = useMemo(
    () =>
      upcomingClasses.filter((s) => {
        if (!s.snapshot) return false;
        const r = computeAttendanceReading({ ...s.snapshot, held: s.snapshot.held + 1 }, s.remainingClasses ? s.remainingClasses - 1 : 0);
        return r.percentage < s.snapshot.threshold;
      }).length,
    [upcomingClasses]
  );

  // Commit attendance
  const handleResolveClass = useCallback((id: string, action: "present" | "absent" | "cancelled" | "dl") => {
    const original = subjects.find((s) => s.id === id);
    if (original) {
      setLastCommit(original);
      if (undoTimer) clearTimeout(undoTimer);
      const t = setTimeout(() => setLastCommit(null), 4000);
      setUndoTimer(t);
    }
    resolveClass(id, action);
    setHoverAction(null);
  }, [undoTimer, subjects, resolveClass]);

  // Undo last commit
  const undo = useCallback(() => {
    if (!lastCommit) return;
    if (undoTimer) clearTimeout(undoTimer);
    
    // Find the record for this slot for today
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const record = records.find(r => r.slotId === lastCommit.id && r.date === dateStr);
    
    if (record) {
      removeAttendance(record.id);
    }
    
    setLastCommit(null);
  }, [lastCommit, undoTimer, records, removeAttendance]);

  // Cleanup on unmount
  useEffect(() => () => { if (undoTimer) clearTimeout(undoTimer); }, [undoTimer]);

  // Entrance stagger variants
  const sectionVariants = {
    hidden: { opacity: 0, y: shouldReduce ? 0 : 10 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: shouldReduce ? { duration: 0.01 }
        : { delay: i * 0.055, duration: 0.32, ease: EASE },
    }),
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="px-8 lg:px-12 pt-10 pb-8 flex flex-col min-h-[50vh] justify-center items-start">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-4 text-ink-tertiary"
          >
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="text-micro font-bold tracking-[0.18em] uppercase" style={{ fontFamily: "var(--font-data)" }}>SYNCING TIMETABLE</span>
          </motion.div>
        </div>
      </PageShell>
    );
  }

  if (subjects.length === 0) {
    return (
      <PageShell>
        <div className="px-8 lg:px-12 pt-10 pb-8 flex flex-col min-h-[50vh] justify-center items-start">
          <p className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-4"
             style={{ fontFamily: "var(--font-data)" }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).replace(/,/g, "").toUpperCase().replace(" ", " A ")}
          </p>
          <h1
            className="font-bold tracking-tighter text-ink-v2 leading-[0.82] mb-4"
            style={{
              fontSize: "clamp(3.75rem, 8vw, 6.5rem)",
              fontFamily: "var(--font-display)",
            }}
          >
            FREE DAY
          </h1>
          <p className="text-body-v2 text-ink-secondary font-medium leading-relaxed max-w-md">
            No classes scheduled today.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <LayoutGroup>
        {/* ══════════════════════════════════════════════════════════════════
            §1  HERO — TODAY + Next Class Intelligence
            Compact. Editorial. Both columns on one line at desktop.
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={0}
          className="px-8 lg:px-12 pt-10 pb-8 border-b border-line
            flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <h1
              className="font-bold tracking-tighter text-ink-v2 leading-[0.82]"
              style={{
                fontSize: "clamp(3.75rem, 8vw, 6.5rem)",
                fontFamily: "var(--font-display)",
              }}
            >
              TODAY
            </h1>
            <LiveClock />
          </div>

          {/* RIGHT: Next class intelligence strip */}
          {currentClass && currentReading && (
            <div className="flex flex-col md:items-end pb-0.5">
              <div className="flex md:justify-end items-center gap-2 mb-1.5">
                <div
                  className="h-px w-4"
                  style={{ background: "var(--color-presynce)" }}
                  aria-hidden
                />
                <span className="text-micro font-bold tracking-[0.18em] uppercase text-presynce">
                  LIVE A {currentClass.time}–{currentClass.endTime}
                </span>
              </div>
              <p
                className="font-bold text-ink-v2 tracking-tight leading-none mb-1"
                style={{ fontSize: "clamp(1.0625rem, 2vw, 1.375rem)", fontFamily: "var(--font-display)" }}
              >
                {currentClass.subject}
              </p>
              <p className="text-meta text-ink-secondary font-bold mb-2 tabular-nums"
                style={{ fontFamily: "var(--font-data)" }}>
                {currentClass.room ? `${currentClass.room} A ` : ""}
                {currentClass.snapshot ? `${currentClass.snapshot.effectiveAttended}/${currentClass.snapshot.held}` : "UNSYNCED"}
              </p>
              <div className="flex items-baseline gap-3">
                <span
                  className="font-bold tabular-nums text-ink-v2"
                  style={{ fontSize: "1.25rem", fontFamily: "var(--font-data)" }}
                >
                  {currentReading.percentage.toFixed(1)}%
                </span>
                <SemanticStatus reading={currentReading} size="small" />
              </div>
            </div>
          )}
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════════
            §2  TIMELINE — Spatial day rail
        ══════════════════════════════════════════════════════════════════ */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          custom={1}
          className="border-b border-line px-8 lg:px-12 py-5"
          style={{ background: "rgba(17,16,15,0.012)" }}
        >
          <DayTimeline subjects={subjects} onSelectSubject={setSelectedSubjectId} />
        </motion.section>

        {/* ══════════════════════════════════════════════════════════════════
            §3  UNRESOLVED STRIP — collapses on resolve
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence initial={false}>
          {unresolvedClass && (
            <motion.section
              key={`unresolved-${unresolvedClass.id}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={shouldReduce ? { duration: 0.01 } : SPRING.SOFT}
              className="overflow-hidden border-b border-line"
            >
              <div
                className="px-8 lg:px-12 py-3 flex flex-col sm:flex-row sm:items-center
                  justify-between gap-3"
                style={{ borderLeft: "2px solid var(--color-danger)" }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-micro font-bold tracking-[0.18em] uppercase text-danger">
                    UNRESOLVED
                  </span>
                  <span className="text-body-strong font-bold text-ink-v2">
                    {unresolvedClass.subject}
                  </span>
                  <span className="text-meta tabular-nums text-ink-secondary font-bold"
                    style={{ fontFamily: "var(--font-data)" }}>
                    {unresolvedClass.time}{unresolvedClass.room ? ` A ${unresolvedClass.room}` : ""}
                  </span>
                  <span className="text-meta text-ink-secondary hidden lg:inline">
                    — Were you there-
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    whileTap={shouldReduce ? {} : { scale: 0.96 }}
                    onClick={() => handleResolveClass(unresolvedClass.id, "present")}
                    className="px-4 py-1.5 text-micro font-bold tracking-[0.14em] uppercase
                      transition-colors duration-100"
                    style={{ background: "var(--color-ink-v2)", color: "var(--color-paper)" }}
                  >
                    PRESENT
                  </motion.button>
                  <motion.button
                    whileTap={shouldReduce ? {} : { scale: 0.96 }}
                    onClick={() => handleResolveClass(unresolvedClass.id, "absent")}
                    className="px-4 py-1.5 text-micro font-bold tracking-[0.14em] uppercase
                      transition-colors duration-100 hover:border-ink-secondary"
                    style={{
                      border: "1px solid var(--color-line-strong)",
                      color: "var(--color-ink-v2)",
                      background: "var(--color-paper)",
                    }}
                  >
                    ABSENT
                  </motion.button>
                  <motion.button
                    whileTap={shouldReduce ? {} : { scale: 0.96 }}
                    onClick={() => handleResolveClass(unresolvedClass.id, "dl")}
                    className="px-4 py-1.5 text-micro font-bold tracking-[0.14em] uppercase
                      transition-colors duration-100 hover:border-ink-secondary"
                    style={{
                      border: "1px solid var(--color-line-strong)",
                      color: "var(--color-ink-v2)",
                      background: "var(--color-paper)",
                    }}
                  >
                    DL
                  </motion.button>
                  <motion.button
                    whileTap={shouldReduce ? {} : { scale: 0.96 }}
                    onClick={() => handleResolveClass(unresolvedClass.id, "cancelled")}
                    className="px-4 py-1.5 text-micro font-bold tracking-[0.14em] uppercase
                      transition-colors duration-100 hover:text-ink-v2"
                    style={{
                      border: "1px dashed var(--color-ink-tertiary)",
                      color: "var(--color-ink-tertiary)",
                      background: "transparent",
                    }}
                  >
                    NOT HELD
                  </motion.button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════
            §4  ACTIVE CLASS — The decision center
            Left: identity &rarr; data &rarr; threshold &rarr; decision rows
            Right (desktop): supplementary projections
        ══════════════════════════════════════════════════════════════════ */}
        {currentClass && currentReading && (
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            custom={2}
            className="border-b border-line px-8 lg:px-12 py-8"
          >
            <div className="flex flex-col lg:flex-row lg:gap-16">

              {/* ── Left column ── */}
              <div className="flex-1 min-w-0">

                {/* Subject header */}
                <div className="mb-5">
                  <h2
                    className="font-bold text-ink-v2 tracking-tight leading-none uppercase mb-2"
                    style={{ fontSize: "clamp(1.625rem, 3.5vw, 2.5rem)", fontFamily: "var(--font-display)" }}
                  >
                    {currentClass.subject}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap text-meta font-bold
                    tracking-[0.1em] uppercase text-ink-secondary"
                    style={{ fontFamily: "var(--font-data)" }}>
                    <span className="tabular-nums">{currentClass.time}–{currentClass.endTime}</span>
                    {currentClass.room && (
                      <>
                        <span aria-hidden>A</span>
                        <span>{currentClass.room}</span>
                      </>
                    )}
                    <span aria-hidden>A</span>
                    <span className="tabular-nums">
                      {currentClass.snapshot ? `${currentClass.snapshot.effectiveAttended}/${currentClass.snapshot.held}` : "UNSYNCED"} OFFICIAL
                    </span>
                  </div>
                  {currentClass.state === "resolved" && (
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-meta font-bold tracking-[0.1em] uppercase text-safe">
                        RESOLVED: {currentClass.decision === "dl" ? "DUTY LEAVE" : currentClass.decision}
                      </span>
                      <button
                        onClick={() => unresolveClass(currentClass.id)}
                        className="text-micro font-bold tracking-[0.14em] uppercase text-danger underline hover:opacity-80"
                      >
                        RESET
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary status — the hero data moment */}
                <div className="flex items-baseline gap-4 mb-6">
                  <motion.span
                    key={currentReading.percentage}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="font-bold tabular-nums text-ink-v2 leading-none"
                    style={{
                      fontSize: "clamp(3rem, 6vw, 4.25rem)",
                      fontFamily: "var(--font-data)",
                    }}
                    aria-label={`Attendance: ${currentReading.percentage.toFixed(1)} percent`}
                  >
                    {currentReading.percentage.toFixed(1)}%
                  </motion.span>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${currentReading.status}-${currentReading.canStillMiss}-${currentReading.classesToRecover}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={shouldReduce ? { duration: 0.01 } : { duration: 0.18, ease: EASE }}
                    >
                      <SemanticStatus reading={currentReading} size="large" />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Threshold rail */}
                <div className="mb-6 max-w-sm">
                  <ThresholdRail snapshot={currentClass.snapshot} hoverAction={hoverAction} remainingClasses={currentClass.remainingClasses || 0} />
                </div>

                {/* Decision rows */}
                <div
                  className="flex flex-col max-w-lg"
                  role="group"
                  aria-label="Mark your attendance"
                >
                  {/* Top rule */}
                  <div className="border-t border-line" />
                  <DecisionRow remainingClasses={currentClass?.remainingClasses || 0}
                    action="attend"
                    snapshot={currentClass.snapshot}
                    isActive={hoverAction === "attend"}
                    onActivate={() => setHoverAction("attend")}
                    onDeactivate={() => setHoverAction(null)}
                    onCommit={() => resolveClass(currentClass.id, "present")}
                  />
                  <DecisionRow remainingClasses={currentClass?.remainingClasses || 0}
                    action="skip"
                    snapshot={currentClass.snapshot}
                    isActive={hoverAction === "skip"}
                    onActivate={() => setHoverAction("skip")}
                    onDeactivate={() => setHoverAction(null)}
                    onCommit={() => handleResolveClass(currentClass.id, "absent")}
                  />
                  <DecisionRow remainingClasses={currentClass?.remainingClasses || 0}
                    action="cancel"
                    snapshot={currentClass.snapshot}
                    isActive={hoverAction === "cancel"}
                    onActivate={() => setHoverAction("cancel")}
                    onDeactivate={() => setHoverAction(null)}
                    onCommit={() => handleResolveClass(currentClass.id, "cancelled")}
                  />
                  <DecisionRow remainingClasses={currentClass?.remainingClasses || 0}
                    action="dl"
                    snapshot={currentClass.snapshot}
                    isActive={hoverAction === "dl"}
                    onActivate={() => setHoverAction("dl")}
                    onDeactivate={() => setHoverAction(null)}
                    onCommit={() => handleResolveClass(currentClass.id, "dl")}
                  />
                </div>
              </div>

              {/* ── Right column (desktop) — supplementary context ── */}
              <div className="flex flex-col justify-start pt-6 lg:pt-1 lg:w-52 xl:w-64 shrink-0 mt-6 lg:mt-0 border-t lg:border-t-0 border-line">
                <div className="lg:border-l border-line lg:pl-6 grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-0">
                  {[
                    { label: "TARGET", value: currentClass.snapshot ? `${currentClass.snapshot.threshold}.0%` : "SYNC" },
                    { label: "NOW", value: currentClass.snapshot ? `${currentReading.percentage.toFixed(1)}%` : "--%" },
                    {
                      label: "IF ATTEND",
                      value: currentClass.snapshot ? `${computeAttendanceReading({ ...currentClass.snapshot, effectiveAttended: currentClass.snapshot.effectiveAttended + 1, held: currentClass.snapshot.held + 1 }, currentClass.remainingClasses ? currentClass.remainingClasses - 1 : 0).percentage.toFixed(1)}%` : "--%",
                    },
                    {
                      label: "IF SKIP",
                      value: currentClass.snapshot ? `${computeAttendanceReading({ ...currentClass.snapshot, held: currentClass.snapshot.held + 1 }, currentClass.remainingClasses ? currentClass.remainingClasses - 1 : 0).percentage.toFixed(1)}%` : "--%",
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="mb-4">
                      <p className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-0.5">
                        {label}
                      </p>
                      <p
                        className="text-body-strong font-bold tabular-nums text-ink-v2"
                        style={{ fontFamily: "var(--font-data)" }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            §5  LATER TODAY + §6 DAY CONSEQUENCE
        ══════════════════════════════════════════════════════════════════ */}
        {upcomingClasses.length > 0 && (
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            custom={3}
            className="border-b border-line px-8 lg:px-12 py-8"
          >
            <div className="flex flex-col lg:flex-row lg:gap-16">

              {/* Later Today list */}
              <div className="flex-1 min-w-0">
                <p className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary mb-4">
                  LATER TODAY
                </p>
                <div className="flex flex-col divide-y divide-line max-w-2xl" role="list">
                  {upcomingClasses.map((sub) => (
                    <LaterTodayRow key={sub.id} subject={sub} />
                  ))}
                </div>
              </div>

              
              {/* Day consequence */}
              <div
                className="mt-8 lg:mt-0 pt-8 lg:pt-0 border-t lg:border-t-0 border-line
                  lg:border-l lg:pl-12 flex flex-col justify-start
                  w-full lg:w-72 xl:w-80 shrink-0"
              >
                <h3
                  className="font-bold text-ink-v2 tracking-tight leading-tight mb-4"
                  style={{
                    fontSize: "clamp(1.375rem, 2.5vw, 1.875rem)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {upcomingClasses.length} CLASSES<br />REMAIN.
                </h3>
                
                <div className="flex flex-col gap-4">
                  <div className="bg-safe-soft/30 border border-safe-border p-4">
                    <p className="text-micro font-bold tracking-[0.18em] uppercase text-safe mb-2">IF YOU ATTEND ALL</p>
                    <ul className="text-meta text-ink-secondary flex flex-col gap-1.5">
                      {upcomingClasses.map(sub => {
                        if (!sub.snapshot) return <li key={sub.id}>{sub.subject}: --</li>;
                        const r = computeAttendanceReading({ ...sub.snapshot, effectiveAttended: sub.snapshot.effectiveAttended + 1, held: sub.snapshot.held + 1 }, Math.max(0, (sub.remainingClasses || 1) - 1));
                        return (
                          <li key={sub.id} className="flex justify-between">
                            <span className="truncate pr-2">{sub.subject}</span>
                            <span className="font-bold tabular-nums" style={{ fontFamily: "var(--font-data)" }}>{r.percentage.toFixed(1)}%</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="bg-danger-soft/30 border border-danger-border p-4">
                    <p className="text-micro font-bold tracking-[0.18em] uppercase text-danger mb-2">IF YOU SKIP ALL</p>
                    <ul className="text-meta text-ink-secondary flex flex-col gap-1.5">
                      {upcomingClasses.map(sub => {
                        if (!sub.snapshot) return <li key={sub.id}>{sub.subject}: --</li>;
                        const r = computeAttendanceReading({ ...sub.snapshot, held: sub.snapshot.held + 1 }, Math.max(0, (sub.remainingClasses || 1) - 1));
                        const isDanger = r.percentage < sub.snapshot.threshold;
                        return (
                          <li key={sub.id} className="flex justify-between">
                            <span className="truncate pr-2">{sub.subject}</span>
                            <span className={`font-bold tabular-nums ${isDanger ? 'text-danger' : ''}`} style={{ fontFamily: "var(--font-data)" }}>{r.percentage.toFixed(1)}%</span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-3 pt-3 border-t border-danger-border/50 text-meta font-medium text-danger">
                      <strong className="font-bold">{subjectsAtRisk}</strong> {subjectsAtRisk === 1 ? "subject falls" : "subjects fall"} below target.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </LayoutGroup>

      {/* ══════════════════════════════════════════════════════════════════
          UNDO TOAST
      ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {lastCommit && (
          <UndoToast
            key={lastCommit.id}
            subjectName={lastCommit.subject}
            onUndo={undo}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}



