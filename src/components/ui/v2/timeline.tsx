"use client";

import { motion } from "motion/react";
import { SPRING, REDUCED } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
export type ClassState = "resolved" | "current" | "unresolved" | "upcoming" | "past" | "future" | "cancelled";

export interface TimelineEvent {
  id: string;
  time: string;
  label: string;
  /** Short label for display (CN, FEE, etc.) */
  shortLabel: string;
  state: ClassState;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

/**
 * Timeline
 * Spatial visualization of the day's class schedule as a physical rail.
 *
 * Node grammar (Lab A):
 *   ● resolved past    — filled circle, ink
 *   ◉ current now      — filled circle with ring, presynce violet, subtle pulse
 *   ◌ unresolved past  — dashed circle, coral
 *   ○ upcoming         — open circle, ink/muted
 *
 * The rail itself is a thin horizontal rule.
 * Time labels sit above, subject labels below.
 * Node transitions use SPRING.SNAP.
 *
 * Mobile: horizontal scroll. No wrapping.
 */
export function Timeline({ events, className = "" }: TimelineProps) {
  const reducedMotion = useReducedMotion();
  const nodeTransition = reducedMotion ? REDUCED : SPRING.SNAP;

  return (
    <div
      className={`w-full overflow-x-auto no-scrollbar ${className}`}
      role="list"
      aria-label="Today's schedule"
    >
      <div
        className="relative flex items-start"
        style={{ minWidth: `${events.length * 130}px`, paddingTop: "24px", paddingBottom: "24px" }}
      >
        {/* Rail — horizontal axis */}
        <div
          className="absolute left-0 right-0"
          style={{ top: "calc(24px + 10px)", height: "1px", background: "var(--color-line)" }}
          aria-hidden
        />

        {events.map((event) => {
          const isResolved = event.state === "resolved";
          const isCurrent = event.state === "current";
          const isUnresolved = event.state === "unresolved";
          const isUpcoming = event.state === "upcoming";

          return (
            <div
              key={event.id}
              role="listitem"
              aria-label={`${event.time} — ${event.label} (${event.state})`}
              className="flex flex-col items-center"
              style={{ flex: "1 1 0", minWidth: "130px" }}
            >
              {/* Time — above rail */}
              <span className="text-micro font-bold tabular-nums text-ink-secondary mb-2 tracking-[0.1em]">
                {event.time}
              </span>

              {/* Node */}
              <motion.div
                layout
                transition={nodeTransition}
                className="relative flex items-center justify-center"
                style={{ width: "20px", height: "20px", zIndex: 1 }}
              >
                {isCurrent && (
                  <>
                    {/* Pulse ring — only when not reduced motion */}
                    {!reducedMotion && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ border: "1px solid var(--color-presynce)" }}
                        animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeOut",
                        }}
                      />
                    )}
                    {/* Current node — filled, violet ring */}
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: "var(--color-ink-v2)",
                        boxShadow: "0 0 0 3px var(--color-paper), 0 0 0 5px var(--color-presynce)",
                      }}
                    />
                  </>
                )}

                {isResolved && (
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "var(--color-ink-v2)",
                    }}
                  />
                )}

                {isUnresolved && (
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      border: "1.5px dashed var(--color-danger)",
                      background: "var(--color-paper)",
                    }}
                  />
                )}

                {isUpcoming && (
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      border: "1.5px solid var(--color-ink-tertiary)",
                      background: "var(--color-paper)",
                    }}
                  />
                )}
              </motion.div>

              {/* Subject label — below rail */}
              <span
                className={`text-micro font-bold tracking-[0.1em] uppercase mt-2 text-center px-1 ${
                  isCurrent ? "text-ink-v2"
                    : isUnresolved ? "text-danger"
                    : isResolved ? "text-ink-secondary"
                    : "text-ink-tertiary"
                }`}
              >
                {event.shortLabel}
              </span>

              {/* State label */}
              <span
                className={`text-[0.55rem] font-bold tracking-[0.12em] uppercase mt-0.5 ${
                  isCurrent ? "text-presynce"
                    : isUnresolved ? "text-danger"
                    : isResolved ? "text-ink-tertiary"
                    : "text-ink-tertiary/50"
                }`}
              >
                {isCurrent ? "NOW"
                  : isResolved ? "DONE"
                  : isUnresolved ? "LOG"
                  : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
