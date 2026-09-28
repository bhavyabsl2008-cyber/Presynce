/**
 * SemanticStatus
 * Renders the primary decision intelligence: "CAN STILL MISS 02" or "NEEDS 03".
 * This is the answer to "what does this number mean for me today-"
 *
 * Color is strictly semantic:
 *   safe (≥2 skips remaining)  &rarr; green
 *   caution (1 skip remaining) &rarr; amber
 *   danger (below threshold)   &rarr; coral
 *
 * The primary percentage remains ink — SemanticStatus is the companion,
 * not the headline.
 */
import type { AttendanceReading } from "@/domain/attendance";

interface SemanticStatusProps {
  reading: AttendanceReading;
  className?: string;
  style?: React.CSSProperties;
}

function getStatusColor(reading: AttendanceReading): string {
  if (reading.status === "danger") return "text-danger";
  if (reading.status === "warn") return "text-caution";
  if (reading.status === "unknown") return "text-ink-tertiary";
  return "text-safe";
}

function getStatusLabel(reading: AttendanceReading, padded = true): string {
  if (reading.status === "unknown") return "NEEDS DATA";
  
  const pad = (n: number) => (padded ? String(n).padStart(2, "0") : String(n));
  if (reading.status === "danger") return `NEEDS ${pad(reading.classesToRecover)}`;
  return `CAN STILL MISS ${pad(reading.canStillMiss)}`;
}

export function SemanticStatus({ reading, className = "", style }: SemanticStatusProps) {
  return (
    <span
      className={`font-bold tracking-[0.12em] uppercase ${getStatusColor(reading)} ${className}`}
      style={style}
    >
      {getStatusLabel(reading)}
    </span>
  );
}

// Expose helpers for cases that need color or label without rendering
export { getStatusColor, getStatusLabel };
