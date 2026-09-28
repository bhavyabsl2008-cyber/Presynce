/**
 * Presynce V2 Motion Language
 * ─────────────────────────────────────────────────────────────
 * All motion constants live here. Components import from this
 * module — never invent durations or stiffness values locally.
 * This is what makes Presynce feel like one physical system
 * rather than independently-tuned components.
 *
 * Principle: motion communicates state change, never decorates.
 * No spring that isn't tied to a real product state transition.
 *
 * See docs/motion-language.md for full rationale.
 */

import type { Transition } from "motion/react";

/* ─── Easing ─────────────────────────────
   EASE_CALM: classic ease-out, no overshoot.
   Used for tween-based transitions where
   we want predictable, calm deceleration.
──────────────────────────────────────── */
export const EASE_CALM = [0.22, 1, 0.36, 1] as const;
export const EASE_OUT = [0.0, 0.0, 0.2, 1.0] as const;

/* ─── Duration Tokens ────────────────────
   micro:     hover/press feedback
   standard:  row transitions, node moves
   structural: section reveals, commits
──────────────────────────────────────── */
export const DURATION = {
  micro: 0.12,     // 100–140ms: hover, press states
  fast: 0.15,      // 150ms: fast state changes, color updates
  normal: 0.22,    // 180–240ms: node travel, row transitions
  structural: 0.35,// 280–400ms: section entrance, page transitions
  hero: 0.6,       // 600ms: major orchestrations, runway fills
  page: 0.4,       // 400ms: page route transitions
  exit: 0.2,       // 200ms: element exit/removal
  // V1 compat aliases
  standard: 0.22,
  slow: 0.6,
  base: 0.35,
} as const;

/* ─── Spring Families ────────────────────
   SNAP:  Immediate, high-stiffness feedback.
          Used for button press, hover field activation.
          No travel — just instant confirmation.

   MOVE:  The primary physics for node travel.
          Used for the threshold node moving from current
          to projected position. Should feel physical, not bouncy.
          Slightly resistant when approaching the threshold boundary.

   SOFT:  Section reveals and CollapseTransitions.
          Lower stiffness allows content to breathe into place.

   All springs are critically damped (no overshoot).
──────────────────────────────────────── */
export const SPRING = {
  SNAP: {
    type: "spring" as const,
    stiffness: 500,
    damping: 35,
    mass: 0.8,
  },
  MOVE: {
    type: "spring" as const,
    stiffness: 320,
    damping: 30,
    mass: 1,
  },
  SOFT: {
    type: "spring" as const,
    stiffness: 200,
    damping: 28,
    mass: 1,
  },
} as const;

/* ─── Layered Motion Architecture ────────
   Phase 3.4 specifies four motion layers.
──────────────────────────────────────── */
export const TRANSITION_PAGE: Transition = {
  duration: DURATION.page,
  ease: EASE_CALM
};

export const TRANSITION_LAYOUT: Transition = {
  duration: DURATION.structural,
  ease: EASE_CALM
};

export const TRANSITION_COMPONENT: Transition = {
  duration: DURATION.normal,
  ease: EASE_CALM
};

export const TRANSITION_MICRO: Transition = {
  duration: DURATION.micro,
  ease: EASE_OUT
};

/* ─── Named Interaction Transitions ──────
   Each name describes WHY something moves,
   not HOW. Components use these to stay
   semantically correct.
──────────────────────────────────────── */
export const TRANSITION = {
  /** Hover/focus state field activation — near-instant */
  interaction: TRANSITION_MICRO,

  /** Node travel on threshold visualization */
  nodeTravel: SPRING.MOVE satisfies Transition,

  /** Ghost node appearance / disappearance */
  projectionFade: { duration: DURATION.micro, ease: EASE_OUT } satisfies Transition,

  /** Percentage and status text update on commit */
  dataUpdate: { duration: DURATION.standard, ease: EASE_CALM } satisfies Transition,

  /** Section collapse (unresolved class resolves) */
  sectionCollapse: SPRING.SOFT satisfies Transition,

  /** Timeline node state change */
  nodeResolve: SPRING.SNAP satisfies Transition,

  /** Page entrance — extremely subtle, near-immediate */
  entrance: { duration: DURATION.structural, ease: EASE_CALM } satisfies Transition,

  /** Commit animation — ghost becomes reality */
  commit: SPRING.MOVE satisfies Transition,

  /** V1 compat */
  stateChange: { duration: DURATION.base, ease: EASE_CALM } satisfies Transition,
  layoutSettle: { duration: DURATION.base, ease: EASE_CALM } satisfies Transition,
} as const;

/* ─── Reduced Motion ─────────────────────
   When prefers-reduced-motion is detected,
   replace all transitions with instant crossfades.
   Information is preserved; only motion is removed.
   Use the useReducedMotion hook from framer-motion
   to conditionally apply this.
──────────────────────────────────────── */
export const REDUCED: Transition = { duration: 0.01 };

/* ─── Interaction Scales ─────────────────
   Physical press feedback — restrained.
   Do not exceed scale(0.98) for SaaS interactions.
──────────────────────────────────────── */
export const PRESS_SCALE = 0.97;
export const HOVER_LIFT = 0; // Lab A: no float, no shadow — editorial, flat

/* ─── V1 compat (MOTION object) ─────────
   Existing components that import MOTION continue to work.
──────────────────────────────────────── */
export const MOTION = {
  interaction: TRANSITION.interaction,
  stateChange: TRANSITION.stateChange,
  layoutSettle: TRANSITION.layoutSettle,
  recommendationChange: { duration: DURATION.fast, ease: EASE_CALM },
  reduced: REDUCED,
  pressScale: PRESS_SCALE,
} as const;

/**
 * V1 compat alias.
 * Dashboard components (runway-bar, subject-row, dashboard-hero-rail)
 * import TRANSITION_CALM. Aliased here rather than migrating those files.
 */
export const TRANSITION_CALM = TRANSITION.stateChange;
