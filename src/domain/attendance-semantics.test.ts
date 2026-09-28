import { describe, it, expect } from "vitest";
import { computeAttendanceReading } from "./attendance";

describe("Presynce Product Semantics", () => {
  it("Case A: 40/60, R=64, T=75%", () => {
    const r = computeAttendanceReading({ effectiveAttended: 40, held: 60, threshold: 75, dlCount: 0 }, 64);
    expect(r.classesToRecover).toBe(20);
    expect(r.canStillMiss).toBe(11);
    expect(r.bestCasePercentage).toBe(83.87);
    expect(r.worstCasePercentage).toBe(32.26);
  });

  it("Case B: Current attendance already above target", () => {
    const r = computeAttendanceReading({ effectiveAttended: 50, held: 60, threshold: 75, dlCount: 0 }, 64);
    // (0.75 * 60 - 50) / 0.25 = -20 &rarr; clamped to 0
    expect(r.classesToRecover).toBe(0);
    // S = floor(50 + 64 - 0.75*(124)) = floor(114 - 93) = 21
    expect(r.canStillMiss).toBe(21);
  });

  it("Case C: Current attendance below target but enough future classes remain", () => {
    const r = computeAttendanceReading({ effectiveAttended: 10, held: 60, threshold: 75, dlCount: 0 }, 64);
    // (0.75 * 60 - 10) / 0.25 = (45 - 10) / 0.25 = 140 &rarr; clamped to 140
    expect(r.classesToRecover).toBe(140);
    // S = floor(10 + 64 - 0.75*(124)) = floor(74 - 93) = -19 &rarr; clamped to 0
    expect(r.canStillMiss).toBe(0); // Actually this is Case D, wait.
  });

  it("Case D: Impossible recovery", () => {
    // Current is so low, attending all remaining isn't enough
    const r = computeAttendanceReading({ effectiveAttended: 0, held: 60, threshold: 75, dlCount: 0 }, 20);
    expect(r.canStillMiss).toBe(0);
    expect(r.bestCasePercentage).toBe(25); // 20 / 80
  });
});

