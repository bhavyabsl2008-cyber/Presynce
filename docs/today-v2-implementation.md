# Presynce V2 Today Environment Implementation Architecture

## Overview & Product Mandate

The Today View (`/today`) is the primary operational surface of Presynce V2. It is engineered to give students an instantaneous, authoritative answer to two fundamental questions:
1. *What is my current freedom or debt status right now?* (Evaluated in < 3 seconds)
2. *What exact actions must I take today, and what happens if I attend or skip?* (Evaluated in < 10 seconds)

This document specifies the exact spatial composition, information hierarchy, mock data structures, state machine contracts, mutation handlers, and simulation hooks required to build the production Today screen.

---

## 1. Information Hierarchy & Visual Sequence

The Today view is organized vertically into seven strict environmental layers. Information flows continuously from global situational awareness at the top to granular daily actions and forward predictions at the bottom.

```
+-----------------------------------------------------------------------------------+
| 1. PrimaryNav          | Desktop Top Bar / Mobile Bottom Tabs                     |
+------------------------+----------------------------------------------------------+
| 2. Hero Awareness      | Asymmetric freedom statement ("CAN SKIP 3") + Mono Math  |
+------------------------+----------------------------------------------------------+
| 3. Spatial Timeline    | Day's schedule node track (Resolved/Current/Unresolved)   |
+------------------------+----------------------------------------------------------+
| 4. Unresolved Section  | Action cards for past classes awaiting decision commit   |
+------------------------+----------------------------------------------------------+
| 5. Active Class        | Live session focal card (CN 101 - In Progress)           |
+------------------------+----------------------------------------------------------+
| 6. Later Today         | Upcoming classes scheduled for remaining hours           |
+------------------------+----------------------------------------------------------+
| 7. Day Consequence     | Predictive aggregate impact if all today's classes attended|
+-----------------------------------------------------------------------------------+
```

### The 3-Second and 10-Second Tests

- **The 3-Second Test**: A student opening the application must parse their global attendance status instantly without reading text paragraphs. The Hero Awareness section presents a 7rem display metric (`display-xl`) paired with a semantic status badge (`CAN SKIP 3` in solid `#3DA875` over `#E8F5EE`).
- **The 10-Second Test**: Within 10 seconds, the student can scan unresolved items, hover over a decision button to preview how skipping DBMS changes their status to `CAN SKIP 2`, and commit the action.

---

## 2. Spatial Composition & Layout Architecture

### Desktop Composition (>=1024px Viewports)

Desktop layouts leverage the full width of a 1440px max-width centered canvas, applying an asymmetric 7:5 grid split across structural 64px (4rem) gridlines.

```
+-------------------------------------------------------+---------------------------+
| Hero Left (Col Span 7)                                | Hero Right (Col Span 5)   |
|                                                       |                           |
| CAN SKIP 3                                            | Overall: 82.4%            |
| "Attendance margin is secure. You can miss up to      | Target:  75.0%            |
| 3 classes across your schedule today."                | Margin:  +3 Classes       |
|                                                       | [CompactThreshold Rail]   |
+-------------------------------------------------------+---------------------------+
| Timeline Section (Col Span 12 Full Width)                                         |
| ●-----------●-----------◉-----------◌-----------○                                |
+-------------------------------------------------------+---------------------------+
| Main Action Column (Col Span 7)                       | Side Context (Col Span 5) |
| [Unresolved Decision Cards]                           | [Day Consequence Summary] |
| [Active Class Focal Card]                             | [Subject Quick Breakdown] |
+-------------------------------------------------------+---------------------------+
```

### Mobile Composition (<768px Viewports)

Mobile viewports collapse the asymmetric desktop layout into a single, high-density vertical column (100% width, 16px lateral padding). The primary nav converts into a fixed bottom navigation bar with 0px border radius and 1px hairline top rule.

---

## 3. Canonical Mock Data Specification

The Today environment relies on a standardized baseline dataset representing a real-world student schedule with a uniform 75% minimum threshold requirement across all subjects.

```typescript
export interface TodaySubjectRecord {
  id: string;
  subjectCode: string;
  subjectName: string;
  timeSlot: string;
  room: string;
  attended: number;
  total: number;
  thresholdPercentage: number;
  status: 'resolved' | 'current' | 'unresolved' | 'upcoming';
  decision?: 'attended' | 'skipped' | 'cancelled';
}

export const INITIAL_TODAY_DATA: TodaySubjectRecord[] = [
  {
    id: 'class-01',
    subjectCode: 'DBMS 301',
    subjectName: 'Database Management Systems',
    timeSlot: '08:30 - 09:30 AM',
    room: 'Lab 3B',
    attended: 14,
    total: 17, // Current: 82.35% (Safe)
    thresholdPercentage: 75,
    status: 'unresolved', // Requires user commit
  },
  {
    id: 'class-02',
    subjectCode: 'OOPS 201',
    subjectName: 'Object Oriented Programming',
    timeSlot: '09:40 - 10:40 AM',
    room: 'Hall 102',
    attended: 40,
    total: 47, // Current: 85.10% (Safe)
    thresholdPercentage: 75,
    status: 'resolved',
    decision: 'attended',
  },
  {
    id: 'class-03',
    subjectCode: 'CN 401',
    subjectName: 'Computer Networks',
    timeSlot: '11:00 - 12:00 PM',
    room: 'Room 204',
    attended: 36,
    total: 46, // Current: 78.26% (Safe)
    thresholdPercentage: 75,
    status: 'current', // Active session right now
  },
  {
    id: 'class-04',
    subjectCode: 'FEE 102',
    subjectName: 'Frontend Engineering',
    timeSlot: '01:00 - 02:00 PM',
    room: 'Lab A',
    attended: 30,
    total: 43, // Current: 69.76% (Danger)
    thresholdPercentage: 75,
    status: 'upcoming',
  },
  {
    id: 'class-05',
    subjectCode: 'DECA 101',
    subjectName: 'Design Ethics & Craft',
    timeSlot: '02:10 - 03:10 PM',
    room: 'Studio 4',
    attended: 23,
    total: 31, // Current: 74.19% (Caution)
    thresholdPercentage: 75,
    status: 'upcoming',
  },
  {
    id: 'class-06',
    subjectCode: 'IWT 305',
    subjectName: 'Internet & Web Technologies',
    timeSlot: '03:20 - 04:20 PM',
    room: 'Hall 201',
    attended: 31,
    total: 35, // Current: 88.57% (Safe)
    thresholdPercentage: 75,
    status: 'upcoming',
  },
];
```

---

## 4. State Machine Architecture

Class state transitions follow a deterministic state machine:

```
                  [ SCHEDULED ]
                        |
                        v
                   [ UPCOMING ]
                        |
            (Time reaches timeSlot start)
                        v
                   [ CURRENT ]
                        |
             (Time passes timeSlot end)
                        v
                  [ UNRESOLVED ]
                        |
           (Student clicks Attend / Skip)
                        v
                   [ RESOLVED ]
```

```typescript
export type ClassState = 'resolved' | 'unresolved' | 'current' | 'upcoming';
export type DecisionType = 'attended' | 'skipped' | 'cancelled';

export interface AttendanceState {
  classes: TodaySubjectRecord[];
  activeHoverSimulation: {
    classId: string;
    action: 'attend' | 'skip';
  } | null;
}
```

---

## 5. Core Mutation Handlers & Simulation Patterns

### The `resolveClass` Mutation Pattern

When a student resolves an unresolved or current class, `resolveClass` updates the subject's attended and total counts, assigns the decision state, transitions the class status to `'resolved'`, and triggers layout recalculations.

```typescript
export function resolveClass(
  state: TodaySubjectRecord[],
  classId: string,
  decision: DecisionType
): TodaySubjectRecord[] {
  return state.map((item) => {
    if (item.id !== classId) return item;

    const isAttended = decision === 'attended';
    const isCancelled = decision === 'cancelled';

    return {
      ...item,
      attended: isAttended ? item.attended + 1 : item.attended,
      total: isCancelled ? item.total : item.total + 1,
      status: 'resolved',
      decision,
    };
  });
}
```

### The `hoverAction` Simulation Pattern (Pure Transient State)

CRITICAL RULE: Hovering over decision buttons must NEVER mutate canonical application state or trigger database synchronization. `hoverAction` updates a pure, transient simulation state to drive projected ghost nodes.

```typescript
// React Custom Hook for Transient Simulation Management

import { useState, useCallback } from 'react';

export function useAttendanceSimulation(initialClasses: TodaySubjectRecord[]) {
  const [classes, setClasses] = useState<TodaySubjectRecord[]>(initialClasses);
  const [simulation, setSimulation] = useState<{
    classId: string;
    action: 'attend' | 'skip';
  } | null>(null);

  const startSimulation = useCallback((classId: string, action: 'attend' | 'skip') => {
    setSimulation({ classId, action });
  }, []);

  const clearSimulation = useCallback(() => {
    setSimulation(null);
  }, []);

  const commitDecision = useCallback((classId: string, decision: DecisionType) => {
    setClasses((prev) => resolveClass(prev, classId, decision));
    setSimulation(null); // Clear active simulation on commit
  }, []);

  // Compute aggregated hero metrics (incorporating transient simulation if active)
  const heroMetrics = useMemo(() => {
    let totalAttended = classes.reduce((sum, c) => sum + c.attended, 0);
    let totalClasses = classes.reduce((sum, c) => sum + c.total, 0);

    if (simulation) {
      if (simulation.action === 'attend') {
        totalAttended += 1;
        totalClasses += 1;
      } else if (simulation.action === 'skip') {
        totalClasses += 1;
      }
    }

    const percentage = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 100;
    const canSkip = Math.max(0, Math.floor((totalAttended - 0.75 * totalClasses) / 0.75));

    return {
      percentage: Number(percentage.toFixed(1)),
      canSkip,
      isSimulating: simulation !== null,
    };
  }, [classes, simulation]);

  return {
    classes,
    simulation,
    heroMetrics,
    startSimulation,
    clearSimulation,
    commitDecision,
  };
}
```
