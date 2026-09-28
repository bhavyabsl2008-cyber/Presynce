# Motion Engine Inspiration & Principles (motion.dev / Framer Motion)

## Core Philosophy: Motion as State Transmission

The motion architecture of Presynce V2 is grounded in the engineering principles established by **motion.dev** (formerly Framer Motion). Motion in Presynce V2 is treated strictly as an information channel rather than visual decoration. Every animation must transmit a physical state change—such as node location shifts along a threshold, ghost node projections during hover simulation, or section collapses following decision commits.

```
[ State Update ] ---> [ Motion Engine ] ---> [ Layout Projection Engine ] ---> [ Physical Spring Output ]
```

By leveraging motion.dev's physical spring models and layout projection engine, Presynce V2 achieves fluid micro-interactions without triggering browser reflow penalty costs or layout instability.

---

## Extracted Motion Principles & Architecture

### 1. Spring Physics vs. Fixed Timing Functions
Traditional web animations rely on CSS duration and cubic-bezier curves (e.g. `ease-in-out 300ms`). These fixed-time curves produce mechanical movement and react poorly when interrupted by user interaction. Motion.dev's spring physics model (`type: 'spring'`) calculates velocity, mass, stiffness, and damping dynamically. We extracted three canonical spring configurations for Presynce V2:

- **SNAP (`stiffness: 500, damping: 35`)**: High-stiffness, zero-overshoot spring for instant tactile feedback on active navigation indicators and button presses.
- **MOVE (`stiffness: 320, damping: 30`)**: Balanced spring for physical node translation along threshold rails and timeline position changes.
- **SOFT (`stiffness: 200, damping: 28`)**: Low-stiffness spring for panel reveals, expanding accordions, and structural page entry transitions.

### 2. Magic Move Transitions (`layoutId`)
The `layoutId` prop from motion.dev enables seamless shared element transitions across disparate component trees without manual coordinate calculations. In Presynce V2, `layoutId` drives the primary navigation's active tab sliding pill (`layoutId="active-nav-pill"`). As the student switches tabs, the background focus surface glides between items with physics-based momentum, maintaining visual continuity without flickering or jumping.

### 3. Structural Exit States (`AnimatePresence`)
Removing elements from the React DOM tree typically results in abrupt visual cuts. `AnimatePresence` allows components to perform physical exit animations before unmounting. In the Today view, when an unresolved class decision is committed (e.g., marking "ATTENDED"), the expanded decision row exits using an `AnimatePresence` height collapse and opacity fade, while lower timeline items smoothly translate upward to occupy the freed space using `layout` projection.

### 4. Layout Projection Without Browser Reflow
Modifying CSS layout properties (`height`, `width`, `margin`) during animation forces browser layout recalculation (reflow), degrading performance to sub-60fps. Motion.dev solves this via CSS transform matrix calculations (`scaleX`, `scaleY`, `translateX`, `translateY`). Presynce V2 enforces the `layout` prop on dynamic containers, guaranteeing 60fps animations across both desktop and mobile devices.

### 5. Accessibility Integration (`useReducedMotion`)
Motion.dev provides native hooks for respecting system accessibility preferences (`useReducedMotion`). In Presynce V2, when reduced motion is requested by the OS, all spring translations and layout projections instantly convert into opacity crossfades (`100ms`), preserving state clarity while respecting user comfort.
