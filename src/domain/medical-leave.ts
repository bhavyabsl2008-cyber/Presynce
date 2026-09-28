import { getScheduledSlotsForDate } from "@/lib/timetable/calendar";
import { TimetableSlot, AttendanceRecord, CalendarException, Subject } from "@/domain/models";
import { parseISO, addDays, isBefore, isEqual, startOfDay, format } from "date-fns";

export function generateMedicalLeaveRecords(
  eventId: string,
  startDateStr: string,
  endDateStr: string,
  slots: TimetableSlot[],
  subjects: Subject[]
): Omit<AttendanceRecord, "id" | "timestamp">[] {
  let current = startOfDay(parseISO(startDateStr));
  const end = startOfDay(parseISO(endDateStr));
  
  const records: Omit<AttendanceRecord, "id" | "timestamp">[] = [];
  let daysCount = 0;
  const maxDays = 100;
  
  while ((isBefore(current, end) || isEqual(current, end)) && daysCount < maxDays) {
    const dateStr = format(current, "yyyy-MM-dd");
    const daySlots = getScheduledSlotsForDate(dateStr, slots, subjects);
    
    daySlots.forEach(slot => {
      records.push({
        slotId: slot.id,
        subjectId: slot.subjectId,
        date: dateStr,
        status: "dl",
        sourceEventId: eventId
      });
    });
    
    current = addDays(current, 1);
    daysCount++;
  }
  
  return records;
}
