import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Student, Subject, TimetableSlot, AttendanceRecord, LeaveRequest, AttendanceEvent } from '@/domain/models';
import { SyncMeta } from '@/services/sync/types';

interface PresynceState {
  sessionToken: string | null;
  setSessionToken: (token: string | null) => void;
  student: Student | null;
  subjects: Subject[];
  slots: TimetableSlot[];
  records: AttendanceRecord[];
  leaves: LeaveRequest[];
  events: AttendanceEvent[];
  syncMeta: SyncMeta;
  
  // Actions
  setStudent: (student: Student) => void;
  setActiveBatchId: (batchId: string) => void;
  updateGlobalTarget: (target: number) => void;
  
  addSubject: (subject: Subject) => void;
  updateSubject: (subject: Subject) => void;
  removeSubject: (id: string) => void;
  mergeSubjectAttendance: (id: string, attended: number, dl: number, ml: number, delivered: number, lastUpdated: string, source: "OCR" | "Manual" | "System" | "Chalkpad", dataAsOf?: string) => void;
  
  addSlot: (slot: TimetableSlot) => void;
  updateSlot: (slot: TimetableSlot) => void;
  removeSlot: (id: string) => void;
  
  logAttendance: (record: AttendanceRecord) => void;
  removeAttendance: (id: string) => void;
  addEvent: (event: AttendanceEvent) => void;
  updateEvent: (event: AttendanceEvent) => void;
  removeEventAndRecords: (eventId: string) => void;
  
  resetStore: () => void;
  
  addLeave: (leave: LeaveRequest) => void;
  removeLeave: (id: string) => void;
  
  setSyncMeta: (meta: Partial<SyncMeta>) => void;
  
  clearAll: () => void;
}

export const useStore = create<PresynceState>()(
  persist(
    (set) => ({
      sessionToken: null,
      setSessionToken: (token) => set({ sessionToken: token }),
      student: null,
      subjects: [],
      slots: [],
      records: [],
      leaves: [],
      events: [],
      syncMeta: {
        lastSyncedAt: null,
        source: null,
        dataAsOf: null,
        status: "idle",
        error: null,
        updatedSubjectIds: []
      },
      
      setStudent: (student) => set({ student }),
      setActiveBatchId: (batchId) => set((state) => ({
        student: state.student ? { ...state.student, activeBatchId: batchId } : null
      })),
      updateGlobalTarget: (target) => set((state) => ({ 
        student: state.student ? { ...state.student, globalTarget: target } : null 
      })),
      
      addSubject: (subject) => set((state) => ({ subjects: [...state.subjects, subject] })),
      updateSubject: (subject) => set((state) => ({
        subjects: state.subjects.map(s => s.id === subject.id ? subject : s)
      })),
      removeSubject: (id) => set((state) => ({
        subjects: state.subjects.filter(s => s.id !== id),
        slots: state.slots.filter(s => s.subjectId !== id), // cascade
        records: state.records.filter(r => r.subjectId !== id)
      })),
      mergeSubjectAttendance: (id, attended, dl, ml, delivered, lastUpdated, source, dataAsOf) => set((state) => ({
        subjects: state.subjects.map(s => {
          if (s.id !== id) return s;
          
          return {
            ...s,
            baseAttendance: {
              attended,
              dl,
              ml,
              delivered,
              dataAsOf,
              lastUpdated,
              source
            }
          };
        })
      })),
      
      addSlot: (slot) => set((state) => ({ slots: [...state.slots, slot] })),
      updateSlot: (slot) => set((state) => ({
        slots: state.slots.map(s => s.id === slot.id ? slot : s)
      })),
      removeSlot: (id) => set((state) => ({
        slots: state.slots.filter(s => s.id !== id),
        records: state.records.filter(r => r.slotId !== id) // cascade
      })),
      
      logAttendance: (record) => set((state) => {
        // Find existing record for this slot+date
        const existingIdx = state.records.findIndex(r => r.slotId === record.slotId && r.date === record.date);
        if (existingIdx >= 0) {
          const newRecords = [...state.records];
          newRecords[existingIdx] = record;
          return { records: newRecords };
        }
        return { records: [...state.records, record] };
      }),
      removeAttendance: (id) => set((state) => ({
        records: state.records.filter(r => r.id !== id)
      })),
      
      addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
      updateEvent: (event) => set((state) => ({ events: state.events.map(e => e.id === event.id ? event : e) })),
      
      removeEventAndRecords: (eventId) => set((state) => ({
        events: state.events.filter(e => e.id !== eventId),
        records: state.records.filter(r => r.sourceEventId !== eventId)
      })),
      
      resetStore: () => {
        set({
          sessionToken: null,
      setSessionToken: (token) => set({ sessionToken: token }),
      student: null,
          subjects: [],
          slots: [],
          records: [],
          leaves: [],
          events: [],
        });
      },
      
      addLeave: (leave) => set((state) => ({ leaves: [...state.leaves, leave] })),
      removeLeave: (id) => set((state) => ({
        leaves: state.leaves.filter(l => l.id !== id)
      })),
      
      setSyncMeta: (meta) => set((state) => ({ syncMeta: { ...state.syncMeta, ...meta } })),
      
      clearAll: () => set({ sessionToken: null, student: null, subjects: [], slots: [], records: [], leaves: [], syncMeta: { lastSyncedAt: null, source: null, dataAsOf: null, status: "idle", error: null, updatedSubjectIds: [] } })
    }),
    {
      name: 'presynce-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage),
    }
  )
);






