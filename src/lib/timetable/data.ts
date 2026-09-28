import { CalendarException } from '@/domain/models';

export const SLOTS = [
  { id: 1, time: '9:00–10:00' },
  { id: 2, time: '10:00–11:00' },
  { id: 3, time: '11:00–12:00' },
  { id: 4, time: '12:00–13:00' },
  { id: 5, time: '13:00–14:00', isBreak: true, breakLabel: 'Lunch Break' },
  { id: 6, time: '14:00–15:00' },
  { id: 7, time: '15:00–16:00' },
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const SEMESTER = {
  start: '2026-06-30',
  end: '2026-12-22',
};

export const SUBJECT_COURSE_START: Record<string, string> = {
  '25CSE0202': '2026-09-23',
};

export const SUBJECT_COURSE_END: Record<string, string> = {
  '25CSE0204': '2026-09-11', // OOP
  '25CSE0202': '2026-12-09', // Java
};

export const HOLIDAYS = [
  { start: '2026-08-15', end: '2026-08-15', name: 'Independence Day' },
  { start: '2026-09-04', end: '2026-09-04', name: 'Krishna Janmashtami' },
  { start: '2026-10-02', end: '2026-10-02', name: "Mahatma Gandhi's Birthday" },
  { start: '2026-10-19', end: '2026-10-20', name: 'Dussehra Holidays' },
  { start: '2026-11-07', end: '2026-11-11', name: 'Diwali Break' },
  { start: '2026-11-24', end: '2026-11-24', name: 'Guru Nanak Dev Ji Birthday' },
  { start: '2026-12-25', end: '2026-12-25', name: 'Christmas' },
];

export const KNOWN_EXCEPTIONS: CalendarException[] = [
  {
    id: "exc_nov14",
    date: "2026-11-14",
    type: "special_timetable",
    timetableDayOverride: "Monday", // Assuming Monday timetable for working Saturday
    reason: "Explicitly declared teaching working Saturday"
  }
];

export const SUBJECTS: Record<string, string> = {
  CP: 'C Programming',
  DET: 'Differential Equations & Transformations',
  OSLF: 'Operating System & Linux Fundamentals',
  FEE: 'Front End Engineering-I',
  MCP: 'Modern & Computational Physics',
  DECA: 'DECA',
  EXPLORE: 'Explore Hours',
  '25CSE0202': 'Programming in Java',
  CN: 'Computer Networks',
  DBMS: 'Database Management Systems',
  FEEII: 'Front End Engineering-II',
  DISC: 'Discrete Structures',
};

type BatchSubject = { subject: string; slots: number[]; group?: string | null; isLab: boolean };
type BatchTimetable = Record<string, BatchSubject[]>;

export const TIMETABLES: Record<string, BatchTimetable> = {
  G1: {
    Monday: [
      { subject: 'FEEII', slots: [1, 2], isLab: true },
      { subject: '25CSE0202', slots: [3, 4], isLab: true },
      { subject: 'DBMS', slots: [6, 7], isLab: true },
    ],
    Tuesday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'DISC', slots: [4], isLab: false },
      { subject: 'DBMS', slots: [6, 7], isLab: true },
    ],
    Wednesday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'DISC', slots: [4], isLab: false },
      { subject: 'FEEII', slots: [6, 7], isLab: true },
    ],
    Thursday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'DISC', slots: [7], isLab: false },
    ],
    Friday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'FEEII', slots: [6, 7], isLab: true },
    ],
  },
  G2: {
    Monday: [
      { subject: '25CSE0202', slots: [1], isLab: false },
      { subject: 'DISC', slots: [2], isLab: false },
      { subject: 'FEEII', slots: [6, 7], isLab: true },
    ],
    Tuesday: [
      { subject: 'DBMS', slots: [1], isLab: false },
      { subject: 'DISC', slots: [2], isLab: false },
      { subject: '25CSE0202', slots: [3, 4], isLab: true },
      { subject: 'FEEII', slots: [6, 7], isLab: true },
    ],
    Wednesday: [
      { subject: 'DISC', slots: [2], isLab: false },
      { subject: '25CSE0202', slots: [3, 4], isLab: true },
    ],
    Thursday: [
      { subject: 'DISC', slots: [2], isLab: false },
      { subject: '25CSE0202', slots: [3, 4], isLab: true },
      { subject: 'FEEII', slots: [6, 7], isLab: true },
    ],
    Friday: [
      { subject: 'DISC', slots: [2], isLab: false },
      { subject: '25CSE0202', slots: [3, 4], isLab: true },
      { subject: 'DBMS', slots: [6, 7], isLab: true },
    ],
  },
  G3: {
    Monday: [
      { subject: 'DBMS', slots: [1, 2], isLab: true },
      { subject: 'FEEII', slots: [3, 4], isLab: true },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Tuesday: [
      { subject: 'FEEII', slots: [1, 2], isLab: true },
      { subject: 'DBMS', slots: [3, 4], isLab: true },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Wednesday: [
      { subject: 'DISC', slots: [1], isLab: false },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Thursday: [
      { subject: 'FEEII', slots: [1, 2], isLab: true },
      { subject: 'DISC', slots: [4], isLab: false },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Friday: [
      { subject: 'DISC', slots: [2], isLab: false },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
  },
  G4: {
    Monday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'DISC', slots: [4], isLab: false },
      { subject: 'FEEII', slots: [6, 7], isLab: true },
    ],
    Tuesday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'DISC', slots: [3], isLab: false },
      { subject: 'FEEII', slots: [6, 7], isLab: true },
    ],
    Wednesday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'DBMS', slots: [6, 7], isLab: true },
    ],
    Thursday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'FEEII', slots: [6, 7], isLab: true },
    ],
    Friday: [
      { subject: 'DBMS', slots: [1, 2], isLab: true },
      { subject: '25CSE0202', slots: [3, 4], isLab: true },
      { subject: 'DISC', slots: [6], isLab: false },
    ],
  },
  G5: {
    Monday: [
      { subject: 'FEEII', slots: [1, 2], isLab: true },
      { subject: 'CN', slots: [4], isLab: false },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Tuesday: [
      { subject: 'FEEII', slots: [1, 2], isLab: true },
      { subject: 'CN', slots: [3], isLab: false },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Wednesday: [
      { subject: 'DBMS', slots: [1, 2], isLab: true },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Thursday: [
      { subject: 'FEEII', slots: [1, 2], isLab: true },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Friday: [
      { subject: 'CN', slots: [1], isLab: false },
      { subject: 'DBMS', slots: [3, 4], isLab: true },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
  },
  G6: {
    Monday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'CN', slots: [4], isLab: false },
      { subject: 'DBMS', slots: [6, 7], isLab: true },
    ],
    Tuesday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'CN', slots: [3, 4], isLab: true },
      { subject: 'FEEII', slots: [6, 7], isLab: true },
    ],
    Wednesday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'FEEII', slots: [6, 7], isLab: true },
    ],
    Thursday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'CN', slots: [4], isLab: false },
      { subject: 'DBMS', slots: [6, 7], isLab: true },
    ],
    Friday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'FEEII', slots: [6, 7], isLab: true },
    ],
  },
  G7: {
    Monday: [
      { subject: 'FEEII', slots: [1, 2], isLab: true },
      { subject: 'DBMS', slots: [3, 4], isLab: true },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Tuesday: [
      { subject: 'FEEII', slots: [1, 2], isLab: true },
      { subject: 'DBMS', slots: [3, 4], isLab: true },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Wednesday: [
      { subject: 'CN', slots: [3, 4], isLab: true },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Thursday: [
      { subject: 'FEEII', slots: [1, 2], isLab: true },
      { subject: 'CN', slots: [4], isLab: false },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Friday: [
      { subject: 'CN', slots: [3], isLab: false },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
  },
  G8: {
    Monday: [
      { subject: 'FEEII', slots: [1, 2], isLab: true },
      { subject: 'CN', slots: [4], isLab: false },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Tuesday: [
      { subject: 'DBMS', slots: [1, 2], isLab: true },
      { subject: 'FEEII', slots: [3, 4], isLab: true },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Wednesday: [
      { subject: 'CN', slots: [3, 4], isLab: true },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Thursday: [
      { subject: 'DBMS', slots: [1, 2], isLab: true },
      { subject: '25CSE0202', slots: [6, 7], isLab: true },
    ],
    Friday: [
      { subject: '25CSE0202', slots: [1, 2], isLab: true },
      { subject: 'FEEII', slots: [3, 4], isLab: true },
      { subject: 'CN', slots: [6], isLab: false },
    ],
  },
};
