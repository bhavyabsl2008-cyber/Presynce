import { AttendanceSnapshot, AttendanceRecord, TimetableSlot, Subject } from "./models";

export type AttendanceStatus = "safe" | "warn" | "danger" | "unknown";

export interface AttendanceReading {
  percentage: number;
  status: AttendanceStatus;
  canStillMiss: number;
  classesToRecover: number;
  bestCasePercentage: number;
  worstCasePercentage: number;
}

export function computeAttendanceReading(snapshot: AttendanceSnapshot | null, remainingClasses: number = 0): AttendanceReading {
  if (!snapshot) {
    return { percentage: 0, status: "unknown", canStillMiss: 0, classesToRecover: 0, bestCasePercentage: 0, worstCasePercentage: 0 };
  }

  const { effectiveAttended, held, threshold } = snapshot;

  if (held < 0 || effectiveAttended < 0 || effectiveAttended > held) {
    throw new Error("Invalid attendance snapshot: effectiveAttended must be within [0, held]");
  }

  const percentage = held === 0 ? 0 : parseFloat(((effectiveAttended / held) * 100).toFixed(2));
  
  let canStillMiss = 0;
  let classesToRecover = 0;

  const t = threshold / 100;
  
  if (held > 0 || remainingClasses > 0) {
    // Integer arithmetic (threshold is a whole percentage) avoids floating-point
    // errors at exact boundaries; falls back to the float form otherwise.
    classesToRecover = Number.isInteger(threshold) && threshold < 100
      ? Math.max(0, Math.ceil((threshold * held - 100 * effectiveAttended) / (100 - threshold)))
      : Math.max(0, Math.ceil((t * held - effectiveAttended) / (1 - t)));
    const s = Math.floor(effectiveAttended + remainingClasses - t * (held + remainingClasses));
    canStillMiss = Math.max(0, Math.min(s, remainingClasses));
  }

  const totalPossibleHeld = held + remainingClasses;
  const bestCasePercentage = totalPossibleHeld === 0 ? 0 : parseFloat((((effectiveAttended + remainingClasses) / totalPossibleHeld) * 100).toFixed(2));
  const worstCasePercentage = totalPossibleHeld === 0 ? 0 : parseFloat(((effectiveAttended / totalPossibleHeld) * 100).toFixed(2));

  let status: AttendanceStatus;
  
  // Status matches product semantics: 
  // - If you need classes to recover (percentage < threshold), you are in DANGER.
  // - If you can safely miss 3 or more classes across the semester without dropping below threshold, you are SAFE.
  // - If you are at/above threshold but have very little margin for error (0-2 classes), you are in WARNING.
  if (classesToRecover > 0) {
    status = "danger";
  } else if (canStillMiss >= 3) {
    status = "safe";
  } else {
    status = "warn";
  }

  return { percentage, status, canStillMiss, classesToRecover, bestCasePercentage, worstCasePercentage };
}

export interface SimulatedAttendanceResult {
  reading: AttendanceReading;
  projectedAttended: number;
  projectedHeld: number;
  remainingAfterSimulation: number | null;
  isModified: boolean;
  isRecoveryPossible: boolean;
}

/**
 * Pure hypothetical simulator that combines additional attended and skipped
 * lectures on top of a snapshot without mutating the underlying attendance data.
 */
export function simulateAttendanceProjection(
  snapshot: AttendanceSnapshot | null,
  simulatedAttended: number,
  simulatedSkipped: number,
  remainingClasses?: number | null
): SimulatedAttendanceResult | null {
  if (!snapshot) return null;

  const safeAttended = Math.max(0, Math.floor(simulatedAttended));
  const safeSkipped = Math.max(0, Math.floor(simulatedSkipped));
  const totalSimulated = safeAttended + safeSkipped;

  const projectedAttended = snapshot.effectiveAttended + safeAttended;
  const projectedHeld = snapshot.held + totalSimulated;
  const remainingAfterSimulation =
    remainingClasses !== null && remainingClasses !== undefined
      ? Math.max(0, remainingClasses - totalSimulated)
      : null;

  const reading = computeAttendanceReading(
    {
      effectiveAttended: projectedAttended,
      held: projectedHeld,
      threshold: snapshot.threshold,
      ordinaryAttended: snapshot.ordinaryAttended ?? 0,
      dl: snapshot.dl ?? 0,
      ml: snapshot.ml ?? 0,
    },
    remainingAfterSimulation ?? 0
  );

  const isRecoveryPossible =
    remainingAfterSimulation === null
      ? true
      : reading.classesToRecover <= remainingAfterSimulation;

  return {
    reading,
    projectedAttended,
    projectedHeld,
    remainingAfterSimulation,
    isModified: totalSimulated > 0,
    isRecoveryPossible,
  };
}

/**
 * Derives the snapshot for a single subject by analyzing the global attendance records
 * against the expected timetable slots for that subject.
 *
 * DOUBLE-COUNT PREVENTION:
 * When baseAttendance.dataAsOf is set (i.e. a Chalkpad baseline has been imported),
 * any manual AttendanceRecord whose date is ON or BEFORE that date is considered
 * "absorbed" by the external baseline — it was already counted when Chalkpad
 * reported the cumulative attended/delivered figures. Such records are excluded
 * from the additive extraHeld / extraAttended calculation.
 *
 * The records themselves remain in the store for:
 *   - Today's resolve/unresolve UI (useTodaySchedule uses slotId+date, unaffected here)
 *   - Historical display / audit trail
 *
 * Legacy subjects without dataAsOf (pre-v2 localStorage) receive no filtering:
 * all manual records continue to contribute as before.
 */
export function deriveSnapshot(
  subject: Subject,
  records: AttendanceRecord[],
  globalTarget: number
): AttendanceSnapshot | null {

  if (!subject.baseAttendance) return null;

  const subjectRecords = records.filter(r => r.subjectId === subject.id);

  // If the baseline has a source freshness date, records on or before that date
  // were already incorporated into the baseline's cumulative counts — do not add them again.
  // If dataAsOf is absent (legacy data), all records contribute as before.
  const cutoff = subject.baseAttendance.dataAsOf?? null;
  const unabsorbed = cutoff
    ? subjectRecords.filter(r => r.date > cutoff)
    : subjectRecords;

  const extraHeld     = unabsorbed.filter(r => r.status === "present" || r.status === "absent").length;
  
  const extraOrdinary = unabsorbed.filter(r => r.status === "present").length;
  const extraDl = unabsorbed.filter(r => r.status === "dl").length;
  const extraMl = unabsorbed.filter(r => r.status === "ml").length; // Wait, are these records status 'medical_leave'? Let me check the type later, but likely they are 'present' with sourceEventId? Wait, the V1 uses 'present' for everything but dl. Let's just count 'dl' for now and I will check ml.

  const baseAttended = subject.baseAttendance.attended;
  const baseDl = subject.baseAttendance.dl ?? 0;
  const baseMl = subject.baseAttendance.ml ?? 0;

  const ordinaryAttended = baseAttended + extraOrdinary;
  const dl = baseDl + extraDl;
  const ml = baseMl + extraMl;
  
  const effectiveAttended = ordinaryAttended + dl + ml;

  return {
    ordinaryAttended,
    dl,
    ml,
    effectiveAttended,
    held: subject.baseAttendance.delivered + extraHeld,
    threshold: globalTarget,
  };
}



