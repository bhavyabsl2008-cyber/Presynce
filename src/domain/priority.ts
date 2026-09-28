import {
  computeAttendanceReading,
  type AttendanceReading,
} from "./attendance";
import { type AttendanceSnapshot } from "./models";

/**
 * Determines which subject is the dashboard's "hero" — the one thing
 * a student needs to see first. Pure and framework-free per the
 * engineering manifesto: no UI code should ever compute this inline.
 *
 * Weights are a plain object precisely so the heuristic can be tuned
 * (or swapped per-experiment) without touching a single component.
 */

export interface PriorityWeights {
  /** Percentage points below threshold — direct urgency signal */
  distanceBelowThreshold: number;
  /** Scarcity of safe skips remaining (1 / (canStillMiss + 1)) — rewards "close calls" even while still safe */
  canStillMissScarcity: number;
  /** Classes needed in a row to recover — the actual cost of the hole */
  classesToRecover: number;
  /** Classes scheduled soon — makes an urgent subject also an actionable one right now */
  upcomingClasses: number;
  /** Flat bonus when recovery is mathematically implausible given what's actually scheduled */
  unrecoverable: number;
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  distanceBelowThreshold: 3,
  canStillMissScarcity: 2,
  classesToRecover: 4,
  upcomingClasses: 1,
  unrecoverable: 25,
};

export interface PrioritySubject {
  subject: string;
  snapshot: AttendanceSnapshot;
  /** Classes for this subject scheduled in the near term, if known */
  upcomingClasses?: number;
}

export interface ScoredSubject extends PrioritySubject {
  reading: AttendanceReading;
  score: number;
  /** Exposed for debugging/tuning — not meant to be read by UI components */
  factors: {
    distanceBelowThreshold: number;
    canStillMissScarcity: number;
    classesToRecover: number;
    upcomingClasses: number;
    unrecoverable: boolean;
  };
}

/**
 * "Unrecoverable" here is a heuristic, not a certainty: it means the
 * classes required to recover exceed the classes actually scheduled
 * soon, so recovering in-window looks implausible with the data we
 * have. It should read as a strong signal, never a verdict — a
 * timetable update or more scheduled classes can change it.
 */
function isUnrecoverable(reading: AttendanceReading, upcomingClasses: number): boolean {
  return reading.status === "danger" && reading.classesToRecover > upcomingClasses;
}

export function scoreSubjectPriority(
  input: PrioritySubject,
  weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS
): ScoredSubject {
  const reading = computeAttendanceReading(input.snapshot);
  const upcomingClasses = input.upcomingClasses?? 0;

  const distanceBelowThreshold = Math.max(
    0,
    input.snapshot.threshold - reading.percentage
  );
  const canStillMissScarcity =
    reading.canStillMiss >= 0 ? 1 / (reading.canStillMiss + 1) : 0;
  const unrecoverable = isUnrecoverable(reading, upcomingClasses);

  const score =
    weights.distanceBelowThreshold * distanceBelowThreshold +
    weights.canStillMissScarcity * canStillMissScarcity +
    weights.classesToRecover * reading.classesToRecover +
    weights.upcomingClasses * upcomingClasses +
    weights.unrecoverable * (unrecoverable ? 1 : 0);

  return {
    ...input,
    reading,
    score,
    factors: {
      distanceBelowThreshold,
      canStillMissScarcity,
      classesToRecover: reading.classesToRecover,
      upcomingClasses,
      unrecoverable,
    },
  };
}

export function rankSubjectsByPriority(
  subjects: PrioritySubject[],
  weights?: PriorityWeights
): ScoredSubject[] {
  return subjects
    .map((s) => scoreSubjectPriority(s, weights))
    .sort((a, b) => b.score - a.score);
}

/**
 * Splits subjects into the single hero (highest priority) and the rest,
 * already ranked, for the rail. Returns null hero only when there are
 * no subjects at all.
 */
export function selectHeroSubject(
  subjects: PrioritySubject[],
  weights?: PriorityWeights
): { hero: ScoredSubject | null; rest: ScoredSubject[] } {
  const ranked = rankSubjectsByPriority(subjects, weights);
  const [hero = null, ...rest] = ranked;
  return { hero, rest };
}
