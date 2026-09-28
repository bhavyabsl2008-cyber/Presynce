import { Subject } from "@/domain/models";
import { ChalkpadBridgePayload } from "./types";

export function normalizeSubjectName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchSubject(
  payload: ChalkpadBridgePayload,
  subjects: Subject[]
): Subject | undefined {
  if (payload.subjectCode) {
    const byCode = subjects.find(
      (s) => s.code.toLowerCase() === payload.subjectCode?.toLowerCase()
    );
    if (byCode) return byCode;
  }

  const normalizedPayloadName = normalizeSubjectName(payload.subjectName);

  // Exact match first
  const exact = subjects.find(
    (s) => normalizeSubjectName(s.name) === normalizedPayloadName
  );
  if (exact) return exact;

  // Custom mapping for known edge cases
  const ALIASES: Record<string, string[]> = {
    'databasemanagementsystems': ['dbms', 'databasemanagementsystem'],
    'objectorientedprogramming': ['oop', 'oops'],
    'computernetworks': ['cn'],
    'frontendengineeringii': ['fee2', 'feeii'],
    'frontendengineeringi': ['fee1', 'feei']
  };

  return subjects.find((s) => {
    const nStore = normalizeSubjectName(s.name);
    const nLabel = normalizeSubjectName(s.shortLabel);
    const nCode = normalizeSubjectName(s.code);
    
    // Strict exact matching on aliases/labels to prevent "I" vs "II" overlap
    if (nLabel === normalizedPayloadName && nLabel.length > 2) return true;
    if (nCode === normalizedPayloadName) return true;
    
    // If we have defined aliases that exactly match
    if (ALIASES[nStore]?.includes(normalizedPayloadName)) return true;

    // Do NOT use loose .includes() which causes "Front End Engineering-II" 
    // to overwrite "Front End Engineering-I" attendance.
    return false;
  });
}

export function validateRecord(payload: ChalkpadBridgePayload): boolean {
  if (
    payload.delivered < 0 ||
    payload.attended < 0 ||
    payload.dl < 0 ||
    payload.percentage < 0
  ) {
    return false;
  }

  if (payload.attended + payload.dl > payload.delivered) {
    return false; // Can't attend more than delivered
  }

  // Cross-check percentage if delivered > 0
  if (payload.delivered > 0) {
    const calculatedPct =
      ((payload.attended + payload.dl) / payload.delivered) * 100;
    // Allow ±2% rounding difference
    if (Math.abs(calculatedPct - payload.percentage) > 2) {
      return false;
    }
  }

  return true;
}
