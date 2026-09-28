# Presynce V2 Core Component Specifications

This specification details the contract, props interface, internal state, interaction model, accessibility compliance, and motion behavior for all foundational V2 UI primitives.

---

## 1. PageShell Component

### Purpose
`PageShell` is the root structural frame for all Presynce V2 views. It renders the warm paper substrate (`#F5F2EC`), injects the 64px background architectural gridlines (`rgba(17,16,15,0.04)`), enforces desktop max-width constraints (1440px), and handles standard navigation header injection.

### TypeScript Interface
```typescript
export interface PageShellProps {
  /** Page content elements */
  children: React.ReactNode;
  /** Active navigation tab key */
  activeTab: 'today' | 'subjects' | 'analytics' | 'settings';
  /** Optional custom header right-hand action slot */
  headerAction?: React.ReactNode;
  /** Enable background architectural grid visualizer (default: true) */
  showGrid?: boolean;
  /** Optional custom class name override */
  className?: string;
}
```

### Component State
- `isScrolled`: boolean tracking viewport scroll offset (>20px) to inject hairline bottom border on sticky nav.

### Interaction & Accessibility
- Focus trap is not active at root shell level.
- Main landmark wrapper uses `<main id="main-content" tabIndex={-1}>`.
- Provides a hidden "Skip to main content" link for screen reader and keyboard accessibility.

### Motion Behavior
- Page transitions perform a soft fade-in (`opacity: 0` to `opacity: 1`) using `SPRING_FAMILIES.SOFT` over 280ms when switching routes.

---

## 2. PrimaryNav Component

### Purpose
`PrimaryNav` delivers global navigation across Presynce V2. On desktop viewports (>=768px), it renders as a sleek horizontal header bar with hairline borders. On mobile viewports (<768px), it transforms into a fixed bottom tab bar. Active tab selection is driven by a sliding background layout indicator using Framer Motion's `layoutId`.

### TypeScript Interface
```typescript
export interface NavItem {
  key: 'today' | 'subjects' | 'analytics' | 'settings';
  label: string;
  href: string;
  badgeCount?: number;
}

export interface PrimaryNavProps {
  activeTab: 'today' | 'subjects' | 'analytics' | 'settings';
  onSelectTab?: (key: 'today' | 'subjects' | 'analytics' | 'settings') => void;
}
```

### Component State
- `hoveredTab`: string | null tracking active cursor hover position to drive dynamic focus highlight.

### Interaction & Accessibility
- Rendered inside semantic `<nav aria-label="Main Navigation">`.
- Active item receives `aria-current="page"`.
- Supports ArrowLeft / ArrowRight keyboard navigation across tab items.

### Motion Behavior
- Sliding active indicator uses `layoutId="active-nav-pill"` with `SPRING_FAMILIES.SNAP` (stiffness: 500, damping: 35), sliding between tabs without text flicker.

```tsx
// Pattern: layoutId Sliding Indicator
{isActive && (
  <motion.div
    layoutId="active-nav-pill"
    className="absolute inset-0 bg-ink text-paper z-0"
    transition={SPRING_FAMILIES.SNAP}
  />
)}
```

---

## 3. SemanticStatus Component

### Purpose
`SemanticStatus` is the core attendance evaluation badge. It transforms raw percentage calculations into human-centric freedom statements ("CAN SKIP 3") or recovery directives ("NEEDS 2"). It strictly applies semantic status colors based on safety margin thresholds.

### TypeScript Interface
```typescript
export interface AttendanceReading {
  attended: number;
  total: number;
  thresholdPercentage: number; // e.g. 75
}

export interface SemanticStatusProps {
  reading: AttendanceReading;
  /** Size variant: 'sm' | 'md' | 'lg' (default: 'md') */
  size?: 'sm' | 'md' | 'lg';
  /** Show quantitative calculation breakdown alongside statement */
  showDetails?: boolean;
}
```

### Internal Logic & State Computation
```typescript
// Pure derivation function
export function calculateAttendanceStatus(reading: AttendanceReading) {
  const { attended, total, thresholdPercentage } = reading;
  const currentPct = total > 0 ? (attended / total) * 100 : 100;
  const targetRatio = thresholdPercentage / 100;

  if (currentPct >= thresholdPercentage) {
    // Max classes student can miss without dropping below threshold
    const canSkip = Math.floor((attended - targetRatio * total) / targetRatio);
    return {
      status: 'safe' as const,
      label: canSkip === 0 ? 'ON BOUNDARY' : `CAN SKIP ${canSkip}`,
      canSkip,
      margin: canSkip,
    };
  } else {
    // Min classes student must attend consecutively to reach threshold
    const needs = Math.ceil((targetRatio * total - attended) / (1 - targetRatio));
    return {
      status: 'danger' as const,
      label: `NEEDS ${needs}`,
      needs,
      margin: -needs,
    };
  }
}
```

### Interaction & Accessibility
- Screen reader text explicitly announces full status: `aria-label="Attendance status: Can skip 3 classes before falling below 75 percent minimum threshold"`.
- Color contrast meets WCAG AAA standards (High-contrast ink text over soft semantic background fields `#E8F5EE` or `#FCEAEA`).

---

## 4. CompactThreshold Component

### Purpose
`CompactThreshold` is a 60px to 90px tall physical boundary visualizer. It renders a horizontal progress track representing 0% to 100% attendance, a fixed target marker line (e.g. 75%), a solid node for current attendance, and a moving projected ghost node for interactive preview.

```
0%  [====================|-----------o------->   ] 100%
                        75% Target  Current Ghost
```

### TypeScript Interface
```typescript
export interface CompactThresholdProps {
  attended: number;
  total: number;
  thresholdPercentage: number;
  /** Optional projected simulation delta (+1 for attend, -1 for skip, 0 for none) */
  projectedDelta?: number;
  height?: number; // Default: 72px
}
```

### Interaction & Accessibility
- Screen reader accessible via `role="img"` with programmatic `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={100}`, and `aria-valuetext`.
- Dynamic tooltip exposes precise percentage calculation on pointer hover or tap.

### Motion Behavior
- Projected ghost node translates horizontally across the track using `SPRING_FAMILIES.MOVE` (stiffness: 320, damping: 30).
- Target line vibrates slightly (`x: [-1, 1, 0]`) if projected ghost node crosses the minimum threshold mark.

---

## 5. DecisionRow Component

### Purpose
`DecisionRow` is an interactive control row enabling students to simulate or execute attendance decisions for a specific class. It displays dual option buttons ("IF YOU ATTEND" / "IF YOU SKIP") and immediately projects the attendance consequence.

### TypeScript Interface
```typescript
export interface ClassItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  timeSlot: string;
  attended: number;
  total: number;
  thresholdPercentage: number;
  status: 'resolved' | 'unresolved' | 'current' | 'upcoming';
  decision?: 'attended' | 'skipped' | 'cancelled';
}

export interface DecisionRowProps {
  classItem: ClassItem;
  onCommitDecision: (id: string, decision: 'attended' | 'skipped' | 'cancelled') => void;
  onHoverAction?: (action: 'attend' | 'skip' | null) => void;
}
```

### Component State
- `hoveredAction`: 'attend' | 'skip' | null (drives transient ghost projection without mutating application state).
- `isCommitting`: boolean flag indicating pending async mutation.

### Interaction & Accessibility
- Keyboard operable via Tab to focus, Space / Enter to activate decisions.
- Explicit `aria-expanded` state when decision details expand.
- Clear visual focus outline (`2px solid #5B35E8`) on active keyboard focus.

### Motion Behavior
- Hovering over "IF YOU ATTEND" shifts preview percentage upward in real time; hovering over "IF YOU SKIP" shifts percentage downward.
- Clicking a decision button triggers `SPRING_FAMILIES.SNAP` collapse into a compact resolved state item.

---

## 6. Timeline Component

### Purpose
`Timeline` maps the student's daily schedule into a spatial, horizontal node track. Each class is rendered as a node reflecting its temporal and operational state:
- `resolved●`: Attendance marked and stored in history.
- `current◉`: Class currently active in time schedule.
- `unresolved◌`: Past class requiring student input/marking.
- `upcoming○`: Scheduled class later in the day.

```
 (08:00) ●-----------●-----------◉-----------◌-----------○ (17:00)
       Math        Physics       CN        OOPS       DBMS
     Resolved    Resolved     Current   Unresolved  Upcoming
```

### TypeScript Interface
```typescript
export interface TimelineProps {
  classes: ClassItem[];
  activeClassId?: string;
  onSelectClass?: (id: string) => void;
}
```

### Interaction & Accessibility
- Timeline node track wrapped in standard `<ol aria-label="Daily Schedule Timeline">`.
- Each node item rendered as `<li>` with aria label detailing class name, time, and resolution status.
- Arrow keys switch active node selection along the timeline axis.

### Motion Behavior
- Active class node (`current◉`) features a subtle pulsing outer ring animation (scale 1.0 to 1.15 over 1.5s ease-in-out infinite, disabled when `prefers-reduced-motion` is active).
- Resolved nodes transition smoothly using `layoutId` transitions.
