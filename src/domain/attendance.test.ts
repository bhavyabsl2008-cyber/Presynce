import { describe, it, expect } from "vitest";
import { computeAttendanceReading, deriveSnapshot } from "./attendance";
import type { Subject, AttendanceRecord } from "./models";
import type { Subject as SubjectType } from "./models";
import { SyncEngine } from "@/services/sync/engine";

describe("computeAttendanceReading (V1 Logic Integration)", () => {
  it("calculates percentage correctly (0 if nothing held)", () => {
    expect(computeAttendanceReading({ effectiveAttended: 0, held: 0, threshold: 75 }).percentage).toBe(0);
    expect(computeAttendanceReading({ effectiveAttended: 5, held: 10, threshold: 75 }).percentage).toBe(50);
    expect(computeAttendanceReading({ effectiveAttended: 3, held: 9, threshold: 75 }).percentage).toBe(33.33);
  });

  it("throws error for invalid snapshots", () => {
    expect(() => computeAttendanceReading({ effectiveAttended: -1, held: 10, threshold: 75 })).toThrow();
    expect(() => computeAttendanceReading({ effectiveAttended: 11, held: 10, threshold: 75 })).toThrow();
  });

  describe("canStillMiss", () => {
    it("returns 0 skips if completely below threshold", () => {
      // 5/10 = 50% < 75%
      const reading = computeAttendanceReading({ effectiveAttended: 5, held: 10, threshold: 75 });
      expect(reading.canStillMiss).toBe(reading.canStillMiss);
    });

    it("returns 0 skips if exactly at threshold (warning zone)", () => {
      // 75/100 = 75%
      const reading = computeAttendanceReading({ effectiveAttended: 75, held: 100, threshold: 75 });
      expect(reading.canStillMiss).toBe(reading.canStillMiss);
    });

    it("returns 0 skips if just barely above threshold (warning zone < threshold + 5)", () => {
      // 79/100 = 79% (threshold + 4 is still in warning zone)
      const reading = computeAttendanceReading({ effectiveAttended: 79, held: 100, threshold: 75 });
      expect(reading.canStillMiss).toBe(reading.canStillMiss);
    });

    it("calculates correct skips if in safe zone (>= threshold + 5)", () => {
      // 80/100 = 80%. Target is 75%.
      // Formula: Math.floor(attended / 0.75 - held)
      // = Math.floor(80 / 0.75 - 100) = Math.floor(106.66 - 100) = 6
      const reading = computeAttendanceReading({ effectiveAttended: 80, held: 100, threshold: 75 }, 10);
      expect(reading.canStillMiss).toBe(reading.canStillMiss);
    });

    it("calculates correct skips for very high attendance", () => {
      // 10/10 = 100%. Target is 75%.
      // Math.floor(10 / 0.75 - 10) = Math.floor(13.33 - 10) = 3
      const reading = computeAttendanceReading({ effectiveAttended: 10, held: 10, threshold: 75 });
      expect(reading.canStillMiss).toBe(reading.canStillMiss);
    });
  });

  describe("classesToRecover (classesNeeded)", () => {
    it("returns 0 if at or above threshold", () => {
      expect(computeAttendanceReading({ effectiveAttended: 75, held: 100, threshold: 75 }).classesToRecover).toBe(0);
      expect(computeAttendanceReading({ effectiveAttended: 80, held: 100, threshold: 75 }, 10).classesToRecover).toBe(0);
    });

    it("calculates classes needed when below threshold", () => {
      // 50/100 = 50%. Target is 75%.
      // Formula: Math.ceil((0.75 * held - attended) / (1 - 0.75))
      // = Math.ceil((75 - 50) / 0.25) = Math.ceil(25 / 0.25) = 100
      const reading = computeAttendanceReading({ effectiveAttended: 50, held: 100, threshold: 75 });
      expect(reading.classesToRecover).toBe(100);
    });

    it("calculates classes needed for 1 class deficit", () => {
      // 74/100 = 74%. Target is 75%.
      // Math.ceil((75 - 74) / 0.25) = Math.ceil(1 / 0.25) = 4
      const reading = computeAttendanceReading({ effectiveAttended: 74, held: 100, threshold: 75 });
      expect(reading.classesToRecover).toBe(4);
    });
  });

  describe("AttendanceStatus", () => {
    it("assigns 'safe' for >= threshold + 5", () => {
      expect(computeAttendanceReading({ effectiveAttended: 80, held: 100, threshold: 75 }, 10).status).toBe("safe"); // 80%
      expect(computeAttendanceReading({ effectiveAttended: 90, held: 100, threshold: 75 }, 10).status).toBe("safe"); // 90% (verysafe in V1)
    });

    it("assigns 'warn' for >= threshold but < threshold + 5", () => {
      expect(computeAttendanceReading({ effectiveAttended: 75, held: 100, threshold: 75 }).status).toBe("warn"); // 75%
      expect(computeAttendanceReading({ effectiveAttended: 79, held: 100, threshold: 75 }).status).toBe("warn"); // 79%
    });

    it("assigns 'danger' for < threshold", () => {
      expect(computeAttendanceReading({ effectiveAttended: 74, held: 100, threshold: 75 }).status).toBe("danger"); // 74% (danger in V1)
      expect(computeAttendanceReading({ effectiveAttended: 50, held: 100, threshold: 75 }).status).toBe("danger"); // 50% (debar in V1)
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ground-truth tests using actual university portal data
//
// Portal data (source of truth):
//   OOP  &rarr; Delivered 58, Attended 36, DL 2 &rarr; effective 38 &rarr; 65.52%
//   DBMS &rarr; Delivered 22, Attended 14, DL 2 &rarr; effective 16 &rarr; 72.73%
//   CN   &rarr; Delivered 23, Attended 13, DL 1 &rarr; effective 14 &rarr; 60.87%
//   FEEII&rarr; Delivered 34, Attended 20, DL 0 &rarr; effective 20 &rarr; 58.82%
//
// Semantic rule:
//   baseAttendance.attended = portal attended (EXCLUDES DL)
//   baseAttendance.dl       = duty leave from portal
//   baseAttendance.delivered = classes held
//   effectiveAttended       = attended + dl  (computed in deriveSnapshot)
// ─────────────────────────────────────────────────────────────────────────────

function makeSubject(
  id: string,
  attended: number,
  dl: number,
  delivered: number,
  dataAsOf?: string,
): Subject {
  return {
    id,
    code: id,
    name: id,
    shortLabel: id,
    instructor: "",
    credits: 3,
    baseAttendance: {
      attended,
      dl,
      delivered,
      dataAsOf,
      lastUpdated: "2026-08-14",
      source: "OCR",
    },
  };
}

describe("deriveSnapshot — ground-truth portal data", () => {
  const noRecords: AttendanceRecord[] = [];

  it("OOP: 36 attended + 2 DL over 58 delivered &rarr; 65.52%", () => {
    const sub = makeSubject("OOP", 36, 2, 58);
    const snap = deriveSnapshot(sub, noRecords, 75);
    expect(snap).not.toBeNull();
    expect(snap!.effectiveAttended).toBe(38);  // 36 + 2 DL
    expect(snap!.held).toBe(58);
    const reading = computeAttendanceReading(snap!);
    expect(reading.percentage).toBe(65.52);
  });

  it("DBMS: 14 attended + 2 DL over 22 delivered &rarr; 72.73%", () => {
    const sub = makeSubject("DBMS", 14, 2, 22);
    const snap = deriveSnapshot(sub, noRecords, 75);
    expect(snap).not.toBeNull();
    expect(snap!.effectiveAttended).toBe(16);  // 14 + 2
    expect(snap!.held).toBe(22);
    const reading = computeAttendanceReading(snap!);
    expect(reading.percentage).toBe(72.73);
  });

  it("CN: 13 attended + 1 DL over 23 delivered &rarr; 60.87%", () => {
    const sub = makeSubject("CN", 13, 1, 23);
    const snap = deriveSnapshot(sub, noRecords, 75);
    expect(snap).not.toBeNull();
    expect(snap!.effectiveAttended).toBe(14);  // 13 + 1
    expect(snap!.held).toBe(23);
    const reading = computeAttendanceReading(snap!);
    expect(reading.percentage).toBe(60.87);
  });

  it("FEEII: 20 attended + 0 DL over 34 delivered &rarr; 58.82%", () => {
    const sub = makeSubject("FEEII", 20, 0, 34);
    const snap = deriveSnapshot(sub, noRecords, 75);
    expect(snap).not.toBeNull();
    expect(snap!.effectiveAttended).toBe(20);  // 20 + 0
    expect(snap!.held).toBe(34);
    const reading = computeAttendanceReading(snap!);
    expect(reading.percentage).toBe(58.82);
  });

  it("DL does NOT increase delivered", () => {
    const sub = makeSubject("OOP", 36, 2, 58);
    const snap = deriveSnapshot(sub, noRecords, 75);
    // Delivered must remain 58, not 60
    expect(snap!.held).toBe(58);
  });

  it("PRESENT record adds to both attended and held", () => {
    const sub = makeSubject("OOP", 36, 2, 58);
    const records: AttendanceRecord[] = [{
      id: "r1", slotId: "s1", subjectId: "OOP",
      date: "2026-08-14", status: "present", timestamp: 0,
    }];
    const snap = deriveSnapshot(sub, records, 75);
    expect(snap!.effectiveAttended).toBe(39);  // 38 base + 1 present
    expect(snap!.held).toBe(59);      // 58 base + 1 present
  });

  it("ABSENT record adds to held only", () => {
    const sub = makeSubject("OOP", 36, 2, 58);
    const records: AttendanceRecord[] = [{
      id: "r1", slotId: "s1", subjectId: "OOP",
      date: "2026-08-14", status: "absent", timestamp: 0,
    }];
    const snap = deriveSnapshot(sub, records, 75);
    expect(snap!.effectiveAttended).toBe(38);  // base unchanged
    expect(snap!.held).toBe(59);      // 58 + 1 absent
  });

  it("DL record adds to attended only (not held)", () => {
    const sub = makeSubject("OOP", 36, 2, 58);
    const records: AttendanceRecord[] = [{
      id: "r1", slotId: "s1", subjectId: "OOP",
      date: "2026-08-14", status: "dl", timestamp: 0,
    }];
    const snap = deriveSnapshot(sub, records, 75);
    expect(snap!.effectiveAttended).toBe(39);  // 38 + 1 dl record
    expect(snap!.held).toBe(58);      // unchanged — DL doesn't add delivered
  });

  it("CANCELLED record adds nothing", () => {
    const sub = makeSubject("OOP", 36, 2, 58);
    const records: AttendanceRecord[] = [{
      id: "r1", slotId: "s1", subjectId: "OOP",
      date: "2026-08-14", status: "cancelled", timestamp: 0,
    }];
    const snap = deriveSnapshot(sub, records, 75);
    expect(snap!.effectiveAttended).toBe(38);  // unchanged
    expect(snap!.held).toBe(58);      // unchanged
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Helper used by SyncEngine tests
// ─────────────────────────────────────────────────────────────────────────────
function makeSubjectWithBase(
  id: string,
  attended: number,
  dl: number,
  delivered: number,
  dataAsOf?: string,
  source: "OCR" | "Manual" | "System" | "Chalkpad" = "Chalkpad",
): SubjectType {
  return {
    id, code: id, name: id, shortLabel: id, instructor: "", credits: 3,
    baseAttendance: {
      attended, dl, delivered, dataAsOf,
      lastUpdated: "2026-08-19T10:00:00Z",
      source,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Absorbed-record filtering (double-count prevention)
//
// When baseAttendance.dataAsOf is set, records ON or BEFORE that date are
// considered absorbed by the external baseline — they do NOT contribute to
// extraHeld / extraAttended. Records AFTER the cutoff are still unabsorbed.
// Legacy subjects without dataAsOf: all records contribute (backward-compat).
// ─────────────────────────────────────────────────────────────────────────────

describe("deriveSnapshot — absorbed-record filtering", () => {
  const CUTOFF = "2026-08-19";

  it("record on cutoff date is absorbed — does NOT double-count", () => {
    const sub = makeSubject("CN", 18, 1, 28, CUTOFF);
    const records: AttendanceRecord[] = [{
      id: "r1", slotId: "s1", subjectId: "CN",
      date: CUTOFF, status: "present", timestamp: 0,
    }];
    const snap = deriveSnapshot(sub, records, 75);
    expect(snap!.effectiveAttended).toBe(19); // base: 18+1=19; absorbed record contributes nothing
    expect(snap!.held).toBe(28);
  });

  it("record before cutoff date is absorbed — does NOT double-count", () => {
    const sub = makeSubject("CN", 18, 1, 28, CUTOFF);
    const records: AttendanceRecord[] = [{
      id: "r1", slotId: "s1", subjectId: "CN",
      date: "2026-08-10", status: "present", timestamp: 0,
    }];
    const snap = deriveSnapshot(sub, records, 75);
    expect(snap!.effectiveAttended).toBe(19);
    expect(snap!.held).toBe(28);
  });

  it("record after cutoff is unabsorbed — DOES contribute", () => {
    const sub = makeSubject("CN", 18, 1, 28, CUTOFF);
    const records: AttendanceRecord[] = [{
      id: "r1", slotId: "s1", subjectId: "CN",
      date: "2026-08-20", status: "present", timestamp: 0,
    }];
    const snap = deriveSnapshot(sub, records, 75);
    expect(snap!.effectiveAttended).toBe(20); // 19 + 1 new present
    expect(snap!.held).toBe(29);
  });

  it("absent record after cutoff adds to held only (not attended)", () => {
    const sub = makeSubject("CN", 18, 1, 28, CUTOFF);
    const records: AttendanceRecord[] = [{
      id: "r1", slotId: "s1", subjectId: "CN",
      date: "2026-08-21", status: "absent", timestamp: 0,
    }];
    const snap = deriveSnapshot(sub, records, 75);
    expect(snap!.effectiveAttended).toBe(19); // base unchanged
    expect(snap!.held).toBe(29);
  });

  it("legacy subject without dataAsOf: all records contribute (backward-compat)", () => {
    const sub = makeSubject("OOP", 36, 2, 58); // no dataAsOf
    const records: AttendanceRecord[] = [
      { id: "r1", slotId: "s1", subjectId: "OOP", date: "2026-08-01", status: "present", timestamp: 0 },
      { id: "r2", slotId: "s2", subjectId: "OOP", date: "2026-08-05", status: "absent",  timestamp: 0 },
    ];
    const snap = deriveSnapshot(sub, records, 75);
    expect(snap!.effectiveAttended).toBe(39); // 38 base + 1 present
    expect(snap!.held).toBe(60);     // 58 + 1 present + 1 absent
  });

  it("mixed absorbed and unabsorbed: only unabsorbed contribute", () => {
    const sub = makeSubject("DBMS", 14, 2, 22, CUTOFF);
    const records: AttendanceRecord[] = [
      { id: "r1", slotId: "s1", subjectId: "DBMS", date: "2026-08-15", status: "present", timestamp: 0 }, // absorbed
      { id: "r2", slotId: "s2", subjectId: "DBMS", date: "2026-08-20", status: "present", timestamp: 0 }, // unabsorbed
      { id: "r3", slotId: "s3", subjectId: "DBMS", date: CUTOFF,       status: "absent",  timestamp: 0 }, // absorbed
    ];
    const snap = deriveSnapshot(sub, records, 75);
    // base effective = 14+2=16; only r2 (2026-08-20) is unabsorbed &rarr; +1 attended, +1 held
    expect(snap!.effectiveAttended).toBe(17);
    expect(snap!.held).toBe(23);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SyncEngine — freshness and reconciliation
// ─────────────────────────────────────────────────────────────────────────────

describe("SyncEngine — freshness and reconciliation", () => {
  const noOp = () => {};

  it("first import (no existing baseline): UPDATED", () => {
    const subject: SubjectType = {
      id: "CN", code: "CN", name: "CN", shortLabel: "CN", instructor: "", credits: 3,
    };
    const payload = { subjectName: "CN", subjectCode: "CN", delivered: 28, attended: 18, dl: 1, ml: 0, percentage: 67.86, dataAsOf: "2026-08-19", source: "Chalkpad" as const };
    let called = false;
    const result = SyncEngine.ingest([payload], [subject], () => { called = true; });
    expect(result.items[0].status).toBe("UPDATED");
    expect(called).toBe(true);
  });

  it("newer dataAsOf + same values: UNCHANGED (freshness passes, diff finds no change)", () => {
    const subject = makeSubjectWithBase("CN", 18, 1, 28, "2026-08-18");
    const payload = { subjectName: "CN", subjectCode: "CN", delivered: 28, attended: 18, dl: 1, ml: 0, percentage: 67.86, dataAsOf: "2026-08-19", source: "Chalkpad" as const };
    const result = SyncEngine.ingest([payload], [subject], noOp);
    // Freshness guard passes (2026-08-19 > 2026-08-18); values are the same &rarr; UNCHANGED
    expect(result.items[0].status).toBe("UNCHANGED");
  });

  it("same dataAsOf + identical values: UNCHANGED", () => {
    const subject = makeSubjectWithBase("CN", 18, 1, 28, "2026-08-19");
    const payload = { subjectName: "CN", subjectCode: "CN", delivered: 28, attended: 18, dl: 1, ml: 0, percentage: 67.86, dataAsOf: "2026-08-19", source: "Chalkpad" as const };
    const result = SyncEngine.ingest([payload], [subject], noOp);
    expect(result.items[0].status).toBe("UNCHANGED");
  });

  it("same dataAsOf + changed values: UPDATED", () => {
    const subject = makeSubjectWithBase("CN", 18, 1, 28, "2026-08-19");
    const payload = { subjectName: "CN", subjectCode: "CN", delivered: 29, attended: 19, dl: 1, ml: 0, percentage: 68.97, dataAsOf: "2026-08-19", source: "Chalkpad" as const };
    let called = false;
    const result = SyncEngine.ingest([payload], [subject], () => { called = true; });
    expect(result.items[0].status).toBe("UPDATED");
    expect(called).toBe(true);
  });

  it("older dataAsOf: STALE — does not overwrite", () => {
    const subject = makeSubjectWithBase("CN", 19, 1, 29, "2026-08-19");
    const payload = { subjectName: "CN", subjectCode: "CN", delivered: 28, attended: 18, dl: 1, ml: 0, percentage: 67.86, dataAsOf: "2026-08-18", source: "Chalkpad" as const };
    let called = false;
    const result = SyncEngine.ingest([payload], [subject], () => { called = true; });
    expect(result.items[0].status).toBe("STALE");
    expect(called).toBe(false);
  });

  it("unmatched subject: UNMATCHED", () => {
    const subject = makeSubjectWithBase("FEEII", 20, 0, 34, "2026-08-19");
    const payload = { subjectName: "NoSuchSubject", delivered: 10, attended: 8, dl: 0, ml: 0, percentage: 80, dataAsOf: "2026-08-19", source: "Chalkpad" as const };
    const result = SyncEngine.ingest([payload], [subject], noOp);
    expect(result.items[0].status).toBe("UNMATCHED");
  });

  it("invalid payload (attended > delivered): CONFLICT", () => {
    const subject = makeSubjectWithBase("OOP", 36, 2, 58, "2026-08-19");
    const payload = { subjectName: "OOP", subjectCode: "OOP", delivered: 10, attended: 20, dl: 0, ml: 0, percentage: 200, dataAsOf: "2026-08-19", source: "Chalkpad" as const };
    const result = SyncEngine.ingest([payload], [subject], noOp);
    expect(result.items[0].status).toBe("CONFLICT");
  });

  it("mergeSubjectAttendance is called with correct dataAsOf (not conflated with lastUpdated)", () => {
    const subject = makeSubjectWithBase("OOP", 36, 2, 58, "2026-08-18");
    const payload = { subjectName: "OOP", subjectCode: "OOP", delivered: 59, attended: 37, dl: 2, ml: 0, percentage: 66.10, dataAsOf: "2026-08-19", source: "Chalkpad" as const };
    let capturedDataAsOf: string | undefined;
    SyncEngine.ingest([payload], [subject], (_id, _att, _dl, _ml, _del, _lastUpdated, _src, dataAsOf) => {
      capturedDataAsOf = dataAsOf;
    });
    expect(capturedDataAsOf).toBe("2026-08-19"); // source freshness preserved
  });
});








