"use client";

import { motion, AnimatePresence } from "motion/react";
import { computeAttendanceReading } from "@/domain/attendance";
import { type AttendanceSnapshot } from "@/domain/models";
import { SPRING, TRANSITION, REDUCED } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface CompactThresholdProps {
  snapshot: AttendanceSnapshot | null;
  remainingClasses?: number;
  /** null = resting, 'attend' = showing attend projection, 'skip' = showing skip projection */
  hoverAction: "attend" | "skip" | null;
  /** Number of classes to simulate. Defaults to 1. */
  simulationCount?: number;
  className?: string;
}

/**
 * CompactThreshold
 * Physical model of the student's position relative to the academic boundary.
 *
 * Visual anatomy (60–90px tall):
 *
 *   TARGET 75
 *       │
 * ──────┤────────●────────        &larr; axis
 *               ●                &larr; current node (ink)
 *               ○                &larr; projected ghost (color matches consequence)
 *
 * Behavior:
 * - Current node sits at currentPercentage position on the axis
 * - On hover, a ghost node emerges and travels to the projected position
 * - If projection crosses the threshold, boundary marker subtly responds
 * - Node travel uses SPRING.MOVE — physically connected, not teleporting
 * - Reduced motion: instant crossfade, no travel
 */
export function CompactThreshold({
  snapshot,
  hoverAction,
  simulationCount = 1,
  className = "",
  remainingClasses = 0,
}: CompactThresholdProps) {
  const reducedMotion = useReducedMotion();

  if (!snapshot) {
    return (
      <div className={`relative w-full flex flex-col justify-center items-center ${className}`} style={{ height: "72px" }} aria-hidden>
         <div className="absolute left-0 right-0" style={{ top: "44px", height: "1px", background: "var(--color-line)" }} />
         <div className="text-micro font-bold tracking-[0.18em] uppercase text-ink-tertiary">SYNCING</div>
      </div>
    );
  }

  const currentReading = computeAttendanceReading(snapshot, remainingClasses);

  const attendSnapshot = { ...snapshot,
    effectiveAttended: snapshot.effectiveAttended + simulationCount,
    held: snapshot.held + simulationCount,
    threshold: snapshot.threshold,
  };
  const skipSnapshot = { ...snapshot,
    effectiveAttended: snapshot.effectiveAttended,
    held: snapshot.held + simulationCount,
    threshold: snapshot.threshold,
  };
  const attendReading = computeAttendanceReading(attendSnapshot, Math.max(0, remainingClasses - simulationCount));
  const skipReading = computeAttendanceReading(skipSnapshot, Math.max(0, remainingClasses - simulationCount));

  const projectedReading =
    hoverAction === "attend" ? attendReading : hoverAction === "skip" ? skipReading : null;

  // Projected node color follows the consequence
  function projectedNodeColor(): string {
    if (!projectedReading) return "transparent";
    if (projectedReading.status === "danger") return "var(--color-danger)";
    if (projectedReading.status === "warn") return "var(--color-caution)";
    return "var(--color-safe)";
  }

  // Does the projection cross the threshold-
  const crossesThreshold =
    projectedReading !== null &&
    ((currentReading.percentage >= snapshot.threshold &&
      projectedReading.percentage < snapshot.threshold) ||
      (currentReading.percentage < snapshot.threshold &&
        projectedReading.percentage >= snapshot.threshold));

  const currentLeft = `${Math.min(Math.max(currentReading.percentage, 5), 95)}%`;
  const projectedLeft = projectedReading
    ? `${Math.min(Math.max(projectedReading.percentage, 5), 95)}%`
    : currentLeft;

  const nodeTransition = reducedMotion ? REDUCED : SPRING.MOVE;
  const fadeTransition = reducedMotion ? REDUCED : TRANSITION.projectionFade;

  return (
    <div
      className={`relative w-full flex flex-col ${className}`}
      style={{ height: "72px" }}
      aria-hidden // Visual supplement — text carries the meaning
    >
      {/* Target label */}
      <div
        className="absolute text-micro font-bold tracking-[0.18em] uppercase text-ink-secondary"
        style={{
          left: `${snapshot.threshold}%`,
          top: "0px",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
        }}
      >
        TARGET {snapshot.threshold}
      </div>

      {/* Axis — horizontal rule */}
      <div
        className="absolute left-0 right-0"
        style={{ top: "44px", height: "1px", background: "var(--color-line)" }}
      />

      {/* Threshold marker — vertical tick */}
      <motion.div
        className="absolute"
        style={{
          left: `${snapshot.threshold}%`,
          top: "36px",
          width: "1.5px",
          height: "16px",
          transform: "translateX(-50%)",
          background: crossesThreshold
            ? "var(--color-danger)"
            : "var(--color-ink-v2)",
          transition: "background 0.2s ease",
        }}
      />

      {/* Projected ghost node — appears before current, communicates direction */}
      <AnimatePresence>
        {hoverAction && projectedReading && (
          <motion.div
            key="ghost"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={fadeTransition}
            className="absolute"
            style={{
              left: projectedLeft,
              top: "37px",
              transform: "translate(-50%, -50%)",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              border: `1.5px dashed ${projectedNodeColor()}`,
              background: "var(--color-paper)",
              zIndex: 1,
            }}
          />
        )}
      </AnimatePresence>

      {/* Current node — the anchor of truth */}
      <motion.div
        className="absolute"
        animate={{ left: currentLeft }}
        transition={nodeTransition}
        style={{
          top: "37px",
          transform: "translate(-50%, -50%)",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          background: "var(--color-ink-v2)",
          boxShadow: "0 0 0 3px var(--color-paper)",
          zIndex: 2,
        }}
      />
    </div>
  );
}



