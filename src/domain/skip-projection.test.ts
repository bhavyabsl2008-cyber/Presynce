import { describe, it, expect } from "vitest";
import { simulateAttendanceProjection } from "./attendance";
import type { AttendanceSnapshot } from "./models";

const snap = (effectiveAttended: number, held: number, threshold = 75): AttendanceSnapshot => ({
  effectiveAttended,
  held,
  threshold,
  ordinaryAttended: effectiveAttended,
  dl: 0,
  ml: 0,
});

describe("manual attendance simulator (simulateAttendanceProjection)", () => {
  it("handles -1, -2, and custom bunk counts using integer arithmetic", () => {
    const base = snap(6, 8, 75);

    const bunk1 = simulateAttendanceProjection(base, 0, 1)!;
    expect(bunk1.projectedAttended).toBe(6);
    expect(bunk1.projectedHeld).toBe(9);
    expect(bunk1.reading.percentage).toBe(66.67);
    expect(bunk1.reading.classesToRecover).toBe(3); // (6+3)/(9+3) = 75%
    expect(bunk1.isModified).toBe(true);

    const bunk2 = simulateAttendanceProjection(base, 0, 2)!;
    expect(bunk2.projectedAttended).toBe(6);
    expect(bunk2.projectedHeld).toBe(10);
    expect(bunk2.reading.percentage).toBe(60);
    expect(bunk2.reading.classesToRecover).toBe(6); // (6+6)/(10+6) = 75%

    const bunkCustom = simulateAttendanceProjection(base, 0, 5)!;
    expect(bunkCustom.projectedAttended).toBe(6);
    expect(bunkCustom.projectedHeld).toBe(13);
    expect(bunkCustom.reading.classesToRecover).toBe(15); // (6+15)/(13+15) = 75%
  });

  it("handles positive attendance adjustments (+1, +2, custom)", () => {
    const base = snap(2, 8, 75);

    const plus1 = simulateAttendanceProjection(base, 1, 0)!;
    expect(plus1.projectedAttended).toBe(3);
    expect(plus1.projectedHeld).toBe(9);
    expect(plus1.reading.classesToRecover).toBe(15);

    const plus2 = simulateAttendanceProjection(base, 2, 0)!;
    expect(plus2.projectedAttended).toBe(4);
    expect(plus2.projectedHeld).toBe(10);
    expect(plus2.reading.classesToRecover).toBe(14);

    const plusCustom = simulateAttendanceProjection(base, 16, 0)!;
    expect(plusCustom.projectedAttended).toBe(18);
    expect(plusCustom.projectedHeld).toBe(24);
    expect(plusCustom.reading.percentage).toBe(75);
    expect(plusCustom.reading.classesToRecover).toBe(0);
  });

  it("combines sequential bunk and attend adjustments accurately", () => {
    const base = snap(2, 8, 75);
    // Bunk 2, then attend 3 => attended = 2 + 3 = 5, held = 8 + 2 + 3 = 13
    const combined = simulateAttendanceProjection(base, 3, 2)!;
    expect(combined.projectedAttended).toBe(5);
    expect(combined.projectedHeld).toBe(13);
    expect(combined.reading.percentage).toBe(38.46);
    // ceil((75*13 - 100*5) / 25) = ceil(475/25) = 19
    expect(combined.reading.classesToRecover).toBe(19);
    expect((5 + 19) / (13 + 19)).toBeGreaterThanOrEqual(0.75);
    expect((5 + 18) / (13 + 18)).toBeLessThan(0.75);
  });

  it("handles target-met and floating-point boundary cases", () => {
    expect(simulateAttendanceProjection(snap(6, 8, 75), 0, 0)!.reading.classesToRecover).toBe(0);
    expect(simulateAttendanceProjection(snap(15, 20, 75), 0, 0)!.reading.classesToRecover).toBe(0);
    expect(simulateAttendanceProjection(snap(7, 10, 70), 0, 0)!.reading.classesToRecover).toBe(0);
    expect(simulateAttendanceProjection(snap(18, 20, 75), 0, 2)!.reading.classesToRecover).toBe(0);
  });

  it("detects when recovery is impossible under remaining-class constraints", () => {
    const base = snap(2, 8, 75);
    // 10 remaining classes initially; after bunking 2, 8 remain, but 22 are needed
    const res = simulateAttendanceProjection(base, 0, 2, 10)!;
    expect(res.remainingAfterSimulation).toBe(8);
    expect(res.reading.classesToRecover).toBe(22);
    expect(res.isRecoveryPossible).toBe(false);
  });

  it("restores original figures on reset and never mutates the input snapshot", () => {
    const base = snap(5, 10, 75);
    const frozen = Object.freeze({ ...base });

    const sim = simulateAttendanceProjection(frozen, 3, 2)!;
    expect(sim.isModified).toBe(true);

    const reset = simulateAttendanceProjection(frozen, 0, 0)!;
    expect(reset.isModified).toBe(false);
    expect(reset.projectedAttended).toBe(5);
    expect(reset.projectedHeld).toBe(10);
    expect(reset.reading.percentage).toBe(50);
    expect(reset.reading.classesToRecover).toBe(10); // (5+10)/(10+10) = 75%
    expect(frozen.effectiveAttended).toBe(5);
    expect(frozen.held).toBe(10);
  });
});
