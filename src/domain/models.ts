export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface Student {
  name: string;
  university: string;
  branch: string;
  semester: string;
  globalTarget: number;
  isOnboarded: boolean;
  activeBatchId?: string | null;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  shortLabel: string;
  instructor: string;
  credits: number;
  type?: "Theory" | "Lab";
  baseAttendance?: {
    attended: number;
    dl: number;
    ml?: number;
    delivered: number;
    dataAsOf?: string;
    lastUpdated: string;
    source: "OCR" | "Manual" | "System" | "Chalkpad";
  };
}

export interface TimetableSlot {
  id: string;
  subjectId: string;
  day: DayOfWeek;
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "10:00"
  room: string;
  building: string;
  type: "Lecture" | "Lab" | "Tutorial";
}

export type AttendanceStatus = "present" | "absent" | "cancelled" | "dl" | "ml";

export interface AttendanceRecord {
  id: string;
  slotId: string;
  subjectId: string;
  date: string; // ISO string YYYY-MM-DD
  status: AttendanceStatus;
  timestamp: number;
  sourceEventId?: string; // Links this record to a bulk event like Medical Leave
}

export interface AttendanceEvent {
  id: string;
  type: "medical_leave";
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  createdAt: number;
  status?: "pending" | "approved" | "rejected";
}

export interface LeaveRequest {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason?: string;
}

// Derived Models (calculated on the fly, not stored)
export interface AttendanceSnapshot {
  ordinaryAttended: number;
  dl: number;
  ml: number;
  effectiveAttended: number;
  held: number;
  threshold: number;
}

export type ExceptionType = 
  | "teaching_day_cancelled" 
  | "teaching_day_added" 
  | "holiday_added"
  | "holiday_cancelled"
  | "subject_cancelled"
  | "special_timetable"; // e.g. "Monday timetable on a Saturday"

export interface CalendarException {
  id: string;
  date: string; // YYYY-MM-DD
  type: ExceptionType;
  /** If type === 'special_timetable', what day's timetable to follow (e.g., "Monday") */
  timetableDayOverride?: DayOfWeek;
  /** If the exception only applies to specific subjects */
  affectedSubjects?: string[]; // Array of subject codes
  reason: string;
}



