import { SEMESTER, HOLIDAYS, KNOWN_EXCEPTIONS, SUBJECT_COURSE_START, SUBJECT_COURSE_END } from './data';
import { TimetableSlot, Subject, DayOfWeek, CalendarException } from '@/domain/models';

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const semStart = parseDate(SEMESTER.start);
const semEnd = parseDate(SEMESTER.end);
const holidayRanges = HOLIDAYS.map(h => ({ start: parseDate(h.start), end: parseDate(h.end) }));

export function calculateRemainingClasses(subject: Subject, slots: TimetableSlot[]): { remaining: number; exceptionsApplied: number } | null {
  if (!slots || slots.length === 0) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let start = tomorrow > semStart ? tomorrow : semStart;
  let end = semEnd;

  if (SUBJECT_COURSE_START[subject.code]) {
    const courseStart = parseDate(SUBJECT_COURSE_START[subject.code]);
    if (start < courseStart) start = courseStart;
  }

  if (SUBJECT_COURSE_END[subject.code]) {
    const courseEnd = parseDate(SUBJECT_COURSE_END[subject.code]);
    if (end > courseEnd) end = courseEnd;
  }

  if (start > end) return { remaining: 0, exceptionsApplied: 0 };

  let remaining = 0;
  let exceptionsApplied = 0;
  const slotsByDay: Record<string, number> = {};
  slots.forEach(s => {
    slotsByDay[s.day] = (slotsByDay[s.day] || 0) + 1;
  });

  const jsDaysToString: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const appliedExceptionIds = new Set<string>();

  let current = new Date(start);
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const dayOfWeekIndex = current.getDay();
    const naturalDayStr = jsDaysToString[dayOfWeekIndex];
    let effectiveDayStr = naturalDayStr;

    // 1. Determine base status (is it a natural teaching day-)
    const isBaseHoliday = holidayRanges.some(h => current >= h.start && current <= h.end);
    let isTeachingDay = !isBaseHoliday && naturalDayStr !== 'Sunday' && naturalDayStr !== 'Saturday';

    // 2. Apply Exceptions for this date
    const dailyExceptions = KNOWN_EXCEPTIONS.filter(exc => exc.date === dateStr);
    
    let exceptionCancelled = false;
    let exceptionAdded = false;

    for (const exc of dailyExceptions) {
      const appliesToUs = !exc.affectedSubjects || exc.affectedSubjects.includes(subject.code);
      if (!appliesToUs) continue;

      appliedExceptionIds.add(exc.id);

      switch (exc.type) {
        case "holiday_added":
        case "teaching_day_cancelled":
        case "subject_cancelled":
          exceptionCancelled = true;
          break;
        case "teaching_day_added":
        case "holiday_cancelled":
          exceptionAdded = true;
          break;
        case "special_timetable":
          exceptionAdded = true;
          if (exc.timetableDayOverride) {
            effectiveDayStr = exc.timetableDayOverride;
          }
          break;
      }
    }

    // Precedence rule: Cancellations strictly override additions if both exist on the same day for a subject
    if (exceptionCancelled) {
      isTeachingDay = false;
    } else if (exceptionAdded) {
      isTeachingDay = true;
    }

    // 3. Special case: if the natural day (e.g. Sunday) actually has slots in the timetable, 
    // we should count it if it's not a holiday/cancelled.
    if (!isBaseHoliday && (naturalDayStr === 'Sunday' || naturalDayStr === 'Saturday') && dailyExceptions.length === 0) {
       if (slotsByDay[naturalDayStr]) {
          isTeachingDay = true;
       }
    }

    if (isTeachingDay) {
      if (slotsByDay[effectiveDayStr]) {
        remaining += slotsByDay[effectiveDayStr];
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return { remaining, exceptionsApplied: appliedExceptionIds.size };
}

export function getScheduledSlotsForDate(dateStr: string, slots: TimetableSlot[], subjects: Subject[]): TimetableSlot[] {
  const current = parseDate(dateStr);
  
  if (current < semStart || current > semEnd) return [];

  const jsDaysToString: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekIndex = current.getDay();
  const naturalDayStr = jsDaysToString[dayOfWeekIndex];
  
  const isBaseHoliday = holidayRanges.some(h => current >= h.start && current <= h.end);
  const baseIsTeachingDay = !isBaseHoliday && naturalDayStr !== 'Sunday' && naturalDayStr !== 'Saturday';
  
  const dailyExceptions = KNOWN_EXCEPTIONS.filter(exc => exc.date === dateStr);
  
  const validSlots: TimetableSlot[] = [];
  
  const jsDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as DayOfWeek[];
  const slotsByEffectiveDay = new Map<string, TimetableSlot[]>();
  jsDays.forEach(d => {
    slotsByEffectiveDay.set(d, slots.filter(s => s.day === d));
  });

  const subjectMap = new Map<string, Subject>();
  subjects.forEach(s => subjectMap.set(s.id, s));
  
  const allSubjectIds = new Set(slots.map(s => s.subjectId));
  
  for (const subjectId of allSubjectIds) {
    const subject = subjectMap.get(subjectId);
    if (!subject) continue;

    // Check course start/end bounds for this subject
    if (SUBJECT_COURSE_START[subject.code] && current < parseDate(SUBJECT_COURSE_START[subject.code])) continue;
    if (SUBJECT_COURSE_END[subject.code] && current > parseDate(SUBJECT_COURSE_END[subject.code])) continue;

    let isTeachingDay = baseIsTeachingDay;
    let effectiveDayStr = naturalDayStr;

    let exceptionCancelled = false;
    let exceptionAdded = false;

    for (const exc of dailyExceptions) {
      const appliesToUs = !exc.affectedSubjects || exc.affectedSubjects.includes(subject.code);
      if (!appliesToUs) continue;

      switch (exc.type) {
        case "holiday_added":
        case "teaching_day_cancelled":
        case "subject_cancelled":
          exceptionCancelled = true;
          break;
        case "teaching_day_added":
        case "holiday_cancelled":
          exceptionAdded = true;
          break;
        case "special_timetable":
          exceptionAdded = true;
          if (exc.timetableDayOverride) {
            effectiveDayStr = exc.timetableDayOverride;
          }
          break;
      }
    }

    if (exceptionCancelled) {
      isTeachingDay = false;
    } else if (exceptionAdded) {
      isTeachingDay = true;
    }

    if (!isBaseHoliday && (naturalDayStr === 'Sunday' || naturalDayStr === 'Saturday') && dailyExceptions.length === 0) {
       // If the timetable actually explicitly schedules classes on weekends
       if (slotsByEffectiveDay.get(naturalDayStr)?.some(s => s.subjectId === subjectId)) {
          isTeachingDay = true;
       }
    }

    if (isTeachingDay) {
      const daySlots = slotsByEffectiveDay.get(effectiveDayStr) || [];
      const mySlots = daySlots.filter(s => s.subjectId === subjectId);
      validSlots.push(...mySlots);
    }
  }

  return validSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
}
