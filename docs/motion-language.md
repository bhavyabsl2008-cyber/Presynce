# Presynce V2 Motion Language & Animation Architecture

## Motion Philosophy: Functional State Transmission

In Presynce V2, motion is strictly defined as an information channel. Motion exists to communicate state change, spatial relationships, boundary crossings, and decision consequences. It is never applied for ornamental fluff, visual decoration, or artificial delight. Every micro-interaction, transition, and spring must answer a single technical requirement: *What functional state change is being transmitted to the user?*

```
[ User Interaction ] ---> [ Spring Physics Engine ] ---> [ Spatial Ghost Node Travel ] ---> [ Threshold Boundary Reaction ]
```

When a student hovers over an action button (e.g., "IF YOU ATTEND"), motion physically projects the hypothetical future onto the UI canvas. A semi-transparent ghost node emerges from the current state marker and slides along the physical threshold rail to its projected end state. Simultaneously, the background percentage dynamically recalculates using tabular figures. Motion makes abstract mathematical calculations physical, readable, and intuitive.

---

## Motion Physics: Spring Configurations & Curves

Presynce V2 relies on spring physics rather than arbitrary linear or cubic-bezier time curves for all dynamic elements. Springs eliminate rigid, robotic animations by maintaining momentum and responding smoothly to interrupting user gestures.

```typescript
// Motion Token Library (Motion / Framer Motion compatible)

export const SPRING_FAMILIES = {
  // SNAP: High stiffness, zero overshoot. Applied to instant interactive feedback (buttons, toggles, active indicator slides).
  SNAP: { type: 'spring', stiffness: 500, damping: 35, mass: 1 },

  // MOVE: Medium stiffness, balanced damping. Applied to spatial node movement along threshold rails and timeline position changes.
  MOVE: { type: 'spring', stiffness: 320, damping: 30, mass: 1 },

  // SOFT: Lower stiffness, soft entrance. Applied to structural panel reveals, page transitions, and collapsing sections.
  SOFT: { type: 'spring', stiffness: 200, damping: 28, mass: 1 },
} as const;

// Calibrated Easing Curve for Non-Spring Transitions
export const EASE_CALM = [0.22, 1, 0.36, 1]; // Smooth ease-out with zero overshoot
```

### Duration Tokens (Fallback & Fixed Animations)

For non-spring CSS keyframe transitions (such as opacity fades or color crossfades), duration tokens are strictly standardized:

```css
:root {
  --duration-micro: 120ms;      /* Range: 100-140ms - Hover highlights, color shifts */
  --duration-standard: 200ms;   /* Range: 180-240ms - Dropdown reveals, badge state swaps */
  --duration-structural: 320ms; /* Range: 280-400ms - Panel collapses, layout restructures */
}
```

---

## Named Key Interactions

### 1. Attendance Projection Hover
When a user hovers over or focuses a decision control ("IF YOU ATTEND" or "IF YOU SKIP"), the current attendance marker remains fixed at its actual location (`#11100F`). Simultaneously, a translucent projected ghost node (`#5B35E8`, opacity 0.50) emerges from the current marker and travels along the `CompactThreshold` rail using the `SPRING_FAMILIES.MOVE` spring. The percentage readout shifts to its projected target value using tabular numbers.

```tsx
// Pattern Example: Projection Ghost Node
<motion.div
  layoutId="projection-ghost"
  initial={{ x: currentPositionX, opacity: 0 }}
  animate={{ x: projectedPositionX, opacity: 0.6 }}
  transition={SPRING_FAMILIES.MOVE}
  className="absolute w-3 h-3 bg-presynce rounded-full"
/>
```

### 2. Commitment Animation
When a user explicitly commits an attendance decision (e.g., clicking "MARK ATTENDED"), the ghost node rapidly snaps into full opacity (`opacity: 1.0`), changing its color to solid carbon ink (`#11100F`). The original current node recedes with a quick scale down (`scale: 0.8`, `opacity: 0`). The threshold line brief flashes Presynce Violet before stabilizing, signifying that hypothetical projection has transformed into permanent historical reality.

### 3. Threshold Boundary Crossing
When an attendance projection crosses the minimum requirement boundary (e.g., dropping from 76% safe to 74% danger), the threshold line reacts physically. The status pill transitions from `--color-safe` (`#3DA875`) to `--color-danger` (`#E25555`) using a micro color crossfade (`120ms`), while the boundary marker executes a micro scale pulse (`scale: [1, 1.15, 1]`) powered by `SPRING_FAMILIES.SNAP`.

### 4. Timeline Node State Transitions
Timeline nodes represent class status states (`resolved●`, `current◉`, `unresolved◌`, `upcoming○`). When a class is resolved, its node morphs from an open circle (`unresolved◌`) to a filled carbon disk (`resolved●`) using a layout transition (`layout` prop with `SPRING_FAMILIES.SNAP`).

### 5. Unresolved Class Collapse
When an unresolved class decision is committed on the Today dashboard, the active decision card height animates smoothly from its expanded height (180px) down to a compact summary bar (48px) while adjacent timeline items shift upward naturally using `layoutId` and `AnimatePresence`.

```tsx
<AnimatePresence mode="wait">
  {isUnresolved ? (
    <motion.div
      key="expanded"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={SPRING_FAMILIES.SOFT}
    >
      <DecisionRow classData={currentClass} />
    </motion.div>
  ) : (
    <motion.div
      key="collapsed"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={SPRING_FAMILIES.SNAP}
    >
      <CompactClassRow classData={currentClass} />
    </motion.div>
  )}
</AnimatePresence>
```

---

## Numeric Transitions & Tabular Figure Rolling

Numeric counters (such as `78.5%` or `14/17`) must never animate with smooth linear character interpolation, which causes jarring font width jitter. Presynce V2 mandates `font-variant-numeric: tabular-nums` (IBM Plex Mono). 

When a decision commitment occurs, the counter executes a rapid numeric roll over 200ms (`--duration-standard`), counting directly from the old integer value to the new value at 60fps without triggering horizontal layout shifts.

---

## Hover Physics vs. Touch Equivalents

Mobile touch devices lack continuous pointer hover states. Presynce V2 implements explicit input adaptations:

```
+-------------------+---------------------------------------------------------------+
| Input Environment | Interactive Flow Pattern                                      |
+-------------------+---------------------------------------------------------------+
| Desktop (Mouse)   | Hover on decision row -> Live Ghost Projection preview        |
|                   | Click decision row -> Direct Commit & State Recalculation     |
+-------------------+---------------------------------------------------------------+
| Mobile (Touch)    | Tap decision row -> First Tap activates Preview state         |
|                   | (Ghost node locks into position, "COMMIT" button slides in)   |
|                   | Second Tap on "COMMIT" -> Final Commitment & Animation        |
+-------------------+---------------------------------------------------------------+
```

---

## Reduced Motion & Accessibility Standard

Presynce V2 respects system-level accessibility settings (`prefers-reduced-motion: reduce`). When reduced motion is requested, all physics-based spring movements, layout translations, and ghost node sliding transitions are instantly converted into 0ms instant state swaps or subtle opacity crossfades (`opacity: 0` to `opacity: 1` over 100ms). No spatial movement occurs, preserving full functional intelligence without triggering motion sensitivity.

```typescript
import { useReducedMotion } from 'motion/react';

export function usePresynceSpring(family: keyof typeof SPRING_FAMILIES) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return { type: 'tween', duration: 0.1, ease: 'linear' };
  }

  return SPRING_FAMILIES[family];
}
```
