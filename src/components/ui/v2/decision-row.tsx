"use client";

import { motion } from "motion/react";
import { computeAttendanceReading } from "@/domain/attendance";
import { type AttendanceSnapshot } from "@/domain/models";
import { SemanticStatus } from "./semantic-status";
import { TRANSITION, REDUCED } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface DecisionRowProps {
  action: "attend" | "skip";
  snapshot: AttendanceSnapshot;
  remainingClasses?: number;
  /** Whether this row is currently being previewed */
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  /** Commits actual attendance state — distinct from preview */
  onCommit: () => void;
}

/**
 * DecisionRow
 * The core product interaction unit.
 *
 * Two states:
 *   RESTING:  Shows consequence label, percentage, status.
 *             Commit button is visually present but understated.
 *   ACTIVE:   Field activates (presynce-field background).
 *             Threshold ghost node projects.
 *             Commit button becomes violet.
 *
 * IMPORTANT: hover/focus/touch activate &rarr; PREVIEW only.
 * Only clicking/pressing the commit button or pressing Enter
 * on the commit button commits actual state.
 * This prevents accidental attendance mutation from exploration.
 *
 * Keyboard: Tab to row &rarr; Enter/Space shows consequence.
 * Tab to commit button &rarr; Enter commits.
 *
 * Touch: Tap row &rarr; activates preview. Tap commit &rarr; commits.
 */
export function DecisionRow({
  action,
  snapshot,
  isActive,
  onActivate,
  onDeactivate,
  onCommit,
  remainingClasses = 0,
}: DecisionRowProps) {
  const reducedMotion = useReducedMotion();
  const isAttend = action === "attend";

  const targetSnapshot = isAttend ? { ...snapshot, effectiveAttended: snapshot.effectiveAttended + 1, held: snapshot.held + 1 } : { ...snapshot, effectiveAttended: snapshot.effectiveAttended, held: snapshot.held + 1 };

  const reading = computeAttendanceReading(targetSnapshot, Math.max(0, remainingClasses - 1));
  const fieldTransition = reducedMotion ? REDUCED : TRANSITION.interaction;

  const rowLabel = isAttend ? "IF YOU ATTEND" : "IF YOU SKIP";
  const commitLabel = isAttend ? "PRESENT" : "ABSENT";

  return (
    <div
      role="group"
      aria-label={`${rowLabel}: ${reading.percentage.toFixed(1)}%`}
      className="relative border-b border-line"
    >
      {/* Active field — lavender wash only on action rows, matches Lab A violet */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={fieldTransition}
        style={{ background: "var(--color-presynce-field)" }}
      />

      <div
        className="relative flex items-center justify-between gap-4 py-4 px-0 cursor-pointer"
        onMouseEnter={onActivate}
        onMouseLeave={onDeactivate}
        onFocus={onActivate}
        onBlur={(e) => {
          // Only deactivate if focus leaves the entire row group
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            onDeactivate();
          }
        }}
        // Touch: tap to toggle preview
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button")) return; // let commit handle it
          if (isActive) onDeactivate();
          else onActivate();
        }}
      >
        {/* Left: consequence information */}
        <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0">
          <span className="text-micro font-bold tracking-[0.14em] uppercase text-ink-secondary w-24 shrink-0">
            {rowLabel}
          </span>
          <span className="text-ink-tertiary text-meta shrink-0" aria-hidden>&rarr;</span>
          <span className="text-body-strong font-bold tabular-nums text-ink-v2 w-14 shrink-0">
            {reading.percentage.toFixed(1)}%
          </span>
          <span className="text-ink-tertiary text-meta shrink-0 hidden sm:inline" aria-hidden>&rarr;</span>
          <div className="flex-1 min-w-0 hidden sm:block">
            <SemanticStatus reading={reading} className="text-micro" />
          </div>
        </div>

        {/* Right: commit button — explicit action only */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCommit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onCommit();
            }
          }}
          className={`shrink-0 px-5 py-2 text-micro font-bold tracking-[0.14em] uppercase
            transition-colors duration-100 outline-none
            focus-visible:ring-2 focus-visible:ring-presynce focus-visible:ring-offset-1 focus-visible:ring-offset-paper
            ${
              isActive ? "bg-presynce text-paper"
                : isAttend ? "bg-ink-v2 text-paper"
                : "border border-line-strong text-ink-v2 bg-paper"
            }`}
          aria-label={`Mark ${commitLabel} for this class`}
        >
          {commitLabel}
        </button>
      </div>
    </div>
  );
}




