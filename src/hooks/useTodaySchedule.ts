import { useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "@/store";
import { deriveSnapshot } from "@/domain/attendance";
import { calculateRemainingClasses } from "@/lib/timetable/calendar";
import { TodaySubject, ClassState } from "@/domain/types";
import { DayOfWeek } from "@/domain/models";

export function useTodaySchedule() {
  const { subjects, slots, records, student, logAttendance, removeAttendance } = useStore();

  const todaySubjects = useMemo(() => {
    if (!student) return [];

    const todayDate = new Date();
    const dayStr = format(todayDate, "EEEE") as DayOfWeek;
    const dateStr = format(todayDate, "yyyy-MM-dd");

    const todaySlots = slots
      .filter((s) => s.day === dayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const currentTime = format(todayDate, "HH:mm");

    return todaySlots.map((slot) => {
      const subject = subjects.find((s) => s.id === slot.subjectId);
      const snapshot = subject ? deriveSnapshot(subject, records, student.globalTarget) : null;
      const projection = subject ? calculateRemainingClasses(subject, slots.filter(s => s.subjectId === subject.id)) : null;

      const record = records.find((r) => r.slotId === slot.id && r.date === dateStr);
      let state: ClassState = "upcoming";
      let decision: "attended" | "skipped" | "cancelled" | "dl" | undefined = undefined;

      if (record) {
        state = "resolved";
        decision = record.status === "present" ? "attended" : record.status === "absent" ? "skipped" : record.status === "dl" ? "dl" : "cancelled";
      } else {
        if (currentTime > slot.endTime) {
          state = "unresolved";
        } else if (currentTime >= slot.startTime && currentTime <= slot.endTime) {
          state = "current";
        } else {
          state = "upcoming";
        }
      }

      return {
        id: slot.id,
        subjectId: subject?.id?? "",
        subject: subject?.name?? "Unknown",
        code: subject?.code?? "",
        shortLabel: subject?.code || subject?.name.substring(0, 3).toUpperCase() || "-",
        time: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
        state,
        decision,
        recordId: record?.id,
        snapshot,
        remainingClasses: projection ? projection.remaining : null,
      };
    });
  }, [subjects, slots, records, student]);

  const resolveClass = (slotId: string, action: "present" | "absent" | "cancelled" | "dl") => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    const dateStr = format(new Date(), "yyyy-MM-dd");
    logAttendance({
      id: crypto.randomUUID(),
      slotId: slot.id,
      subjectId: slot.subjectId,
      date: dateStr,
      status: action,
      timestamp: Date.now(),
    });
  };

  const unresolveClass = (slotId: string) => {
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const record = records.find(r => r.slotId === slotId && r.date === dateStr);
    if (record) {
      removeAttendance(record.id);
    }
  };

  return {
    subjects: todaySubjects,
    resolveClass,
    unresolveClass,
    isLoading: !student,
    error: null,
  };
}


