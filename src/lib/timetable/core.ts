import { TIMETABLES, SUBJECTS, SLOTS, DAYS } from './data';
import { Subject, TimetableSlot, DayOfWeek } from '@/domain/models';

function generateId() {
  return crypto.randomUUID();
}

/**
 * Resolves a batch ID (e.g., 'G1') into a set of V2 Subject and TimetableSlot entities.
 */
export function resolveBatch(batchId: string): { subjects: Subject[], slots: TimetableSlot[] } {
  const batchData = TIMETABLES[batchId];
  if (!batchData) {
    throw new Error(`Batch ${batchId} not found`);
  }

  const subjectsMap = new Map<string, Subject>();
  const slots: TimetableSlot[] = [];

  // Iterate over each day in the batch schedule
  Object.entries(batchData).forEach(([day, entries]) => {
    entries.forEach(entry => {
      // Create subject if it doesn't exist
      if (!subjectsMap.has(entry.subject)) {
        subjectsMap.set(entry.subject, {
          id: generateId(),
          code: entry.subject,
          name: SUBJECTS[entry.subject] || entry.subject,
          shortLabel: SUBJECTS[entry.subject]
            ? SUBJECTS[entry.subject].split(' ').map(w => w[0]).join('').substring(0, 4).toUpperCase()
            : entry.subject,
          instructor: '', 
          credits: entry.isLab ? 1 : 3, // Approximation
        });
      }

      const subject = subjectsMap.get(entry.subject)!;

      // Create a slot for each slot ID in the entry
      entry.slots.forEach(slotId => {
        const slotData = SLOTS.find(s => s.id === slotId);
        if (!slotData) return;

        const [startStr, endStr] = slotData.time.split('–');
        
        // Parse time to standard HH:MM format
        const formatTime = (t: string) => {
          const [h, m] = t.split(':');
          const hr = parseInt(h, 10);
          const finalHr = hr < 9 ? hr + 12 : hr; // convert PM times
          return `${finalHr.toString().padStart(2, '0')}:${m}`;
        };

        slots.push({
          id: generateId(),
          subjectId: subject.id,
          day: day as DayOfWeek,
          startTime: formatTime(startStr),
          endTime: formatTime(endStr),
          room: '',
          building: '',
          type: entry.isLab ? 'Lab' : 'Lecture',
        });
      });
    });
  });

  return {
    subjects: Array.from(subjectsMap.values()),
    slots,
  };
}
