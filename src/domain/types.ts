import { type AttendanceSnapshot } from "./models";

export type ClassState = "resolved" | "unresolved" | "current" | "upcoming";
export type HoverAction = "attend" | "skip" | "cancel" | "dl" | null;

export interface TodaySubject {
  id: string;
  code: string;
  subject: string;
  shortLabel: string;
  time: string;
  endTime: string;
  room: string;
  state: ClassState;
  snapshot: AttendanceSnapshot | null;
  decision?: "attended" | "skipped" | "cancelled" | "dl";
  recordId?: string;
  remainingClasses?: number | null;
}

export interface SemesterSubject {
  id: string;
  code: string;
  name: string;
  shortLabel: string;
  snapshot: AttendanceSnapshot | null;
  instructor?: string;
  credits?: number;
  remainingClasses?: number | null;
  exceptionsApplied?: number;
  /** DL count from the Chalkpad baseline (baseAttendance.dl), kept separate for display */
  baseAttendanceDl?: number;
}

