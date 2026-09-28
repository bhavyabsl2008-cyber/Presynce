import { useState, useEffect } from "react";
import { SemesterSubject } from "@/domain/types";
import { useStore } from "@/store";
import { deriveSnapshot } from "@/domain/attendance";
import { calculateRemainingClasses } from "@/lib/timetable/calendar";

export function useSemesterData() {
  const { subjects, records, student, slots } = useStore();
  const [semesterSubjects, setSemesterSubjects] = useState<SemesterSubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    
    if (!student) {
      setIsLoading(false);
      return;
    }

    const computed: SemesterSubject[] = subjects.map(sub => {
      const snapshot = deriveSnapshot(sub, records, student.globalTarget);
      
      const subSlots = slots.filter(s => s.subjectId === sub.id);
      const projection = calculateRemainingClasses(sub, subSlots);

      return {
        id: sub.id,
        code: sub.code,
        name: sub.name,
        shortLabel: sub.shortLabel,
        instructor: sub.instructor,
        credits: sub.credits,
        snapshot,
        remainingClasses: projection ? projection.remaining : null,
        exceptionsApplied: projection ? projection.exceptionsApplied : 0,
        baseAttendanceDl: sub.baseAttendance?.dl ?? 0,
      };
    });

    setSemesterSubjects(computed);
    setIsLoading(false);
  }, [subjects, records, student, slots]);

  return { subjects: semesterSubjects, isLoading, error: null };
}
