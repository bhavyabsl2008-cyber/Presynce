# Presynce V2 Design Tokens Reference

## Overview

This specification establishes the canonical design token registry for Presynce V2. All values defined herein are immutable source-of-truth tokens that must be consumed via CSS custom properties or Tailwind CSS extended theme tokens. Direct hardcoding of hex values, arbitrary pixel values, or un-tokenized font sizes in UI components is strictly prohibited.

---

## 1. Color Tokens

### Base Palette (Paper & Ink)

The core environment palette models physical paper substrate and carbon ink.

```css
:root {
  /* Paper & Surface Tokens */
  --color-paper: #F5F2EC;         /* Main application environment background */
  --color-surface: #FAF8F3;       /* Dynamic focus panels & elevated surfaces */

  /* Ink Tokens */
  --color-ink: #11100F;           /* Primary text, active icons, solid rules */
  --color-ink-secondary: #69655F; /* Subtitles, secondary headers, inactive tabs */
  --color-ink-tertiary: #9A968F;  /* Micro metadata, timestamps, subtle captions */

  /* Structural Lines & Grids */
  --color-line: rgba(17, 16, 15, 0.10); /* 1px structural section dividers */
  --color-grid: rgba(17, 16, 15, 0.04); /* 64px background architectural gridlines */
}
```

### Brand & Interactive Accent (Presynce Violet)

Presynce Violet represents live system intelligence, active focus, hover states, and primary interactive elements.

```css
:root {
  --color-presynce: #5B35E8;       /* Base brand violet & primary active state */
  --color-presynce-hover: #4F2FD4; /* Hover state for primary buttons & active nodes */
  --color-presynce-soft: #EEE9FF;  /* Highlighting background for selected rows */
  --color-presynce-field: #F5F2FF; /* Subtle background for active input fields */
  --color-presynce-deep: #1C0A5A;  /* High-contrast dark violet for dark badges */
}
```

### Semantic Status Tokens

Semantic colors convey attendance evaluation status. These tokens must only be applied when communicating threshold conditions.

```css
:root {
  /* Safe Zone (Attendance Margin >= Minimum Requirement) */
  --color-safe: #3DA875;
  --color-safe-soft: #E8F5EE;

  /* Caution Zone (Attendance Margin at Boundary or 1 Class Deficit) */
  --color-caution: #D69A32;
  --color-caution-soft: #FBF3E2;

  /* Danger Zone (Attendance Deficit >= 2 Classes) */
  --color-danger: #E25555;
  --color-danger-soft: #FCEAEA;
}
```

---

## 2. Typography Scale Tokens

Presynce V2 uses dynamic CSS `clamp()` functions for display and heading sizes, ensuring seamless fluidity across viewport dimensions without abrupt media query breakpoints.

```css
:root {
  /* Font Family Definitions */
  --font-family-display: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-family-body: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-family-mono: 'IBM Plex Mono', monospace;

  /* Fluid Typography Scale */
  --font-size-display-xl: clamp(4.5rem, 8vw, 7rem);     /* Line-height: 0.95, Weight: 800 */
  --font-size-display-l: clamp(3rem, 6vw, 5rem);        /* Line-height: 1.0,  Weight: 700 */
  --font-size-hero-data: clamp(3rem, 6vw, 4.5rem);      /* Line-height: 1.0,  Weight: 700 */
  --font-size-page-title: clamp(2rem, 4vw, 3rem);       /* Line-height: 1.1,  Weight: 700 */
  --font-size-section-title: clamp(1.375rem, 2.5vw, 2rem); /* Line-height: 1.2, Weight: 600 */
  --font-size-subject-title: clamp(1.25rem, 2vw, 1.625rem);/* Line-height: 1.25, Weight: 600 */

  /* Fixed Body & Metadata Scale */
  --font-size-body-strong: 1.0625rem; /* 17px, Line-height: 1.5, Weight: 600 */
  --font-size-body: 1.0000rem;        /* 16px, Line-height: 1.5, Weight: 400 */
  --font-size-meta: 0.8125rem;        /* 13px, Line-height: 1.4, Weight: 500 */
  --font-size-micro: 0.6875rem;       /* 11px, Line-height: 1.3, Weight: 500 */
}
```

---

## 3. Spacing Scale Tokens

The spacing system relies on an 8px base scale with 4px sub-grid values for micro alignment.

```css
:root {
  --space-1: 0.25rem;  /* 4px  - Micro gap, hairline offsets */
  --space-2: 0.50rem;  /* 8px  - Tight element padding, inline gaps */
  --space-3: 0.75rem;  /* 12px - Input padding, badge margins */
  --space-4: 1.00rem;  /* 16px - Standard component inner padding */
  --space-6: 1.50rem;  /* 24px - Container inner padding, header gap */
  --space-8: 2.00rem;  /* 32px - Section spacing, block padding */
  --space-12: 3.00rem; /* 48px - Major layout component gap */
  --space-16: 4.00rem; /* 64px - Architectural grid step, hero spacing */
  --space-24: 6.00rem; /* 96px - Page section separation */
  --space-32: 8.00rem; /* 128px - Major page boundary spacing */
}
```

---

## 4. Geometry Tokens (Border Radius & Shadows)

In strict adherence to the Lab A visual source of truth, Presynce V2 features flat geometric edges with zero elevation shadows.

```css
:root {
  /* Border Radius Tokens */
  --radius-none: 0px;    /* Default for all containers, buttons, and cards */
  --radius-sm: 2px;      /* Maximum allowed for micro indicators or tags */

  /* Elevation & Shadow Tokens */
  --shadow-none: none;   /* Mandatory across all components. No drop shadows allowed. */
}
```

---

## 5. Tailwind CSS Configuration Mapping

Below is the production TypeScript mapping for `tailwind.config.ts` to ensure all tokens are cleanly accessible via standard Tailwind utility classes.

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      colors: {
        paper: '#F5F2EC',
        surface: '#FAF8F3',
        ink: {
          DEFAULT: '#11100F',
          secondary: '#69655F',
          tertiary: '#9A968F',
        },
        line: 'rgba(17, 16, 15, 0.10)',
        grid: 'rgba(17, 16, 15, 0.04)',
        presynce: {
          DEFAULT: '#5B35E8',
          hover: '#4F2FD4',
          soft: '#EEE9FF',
          field: '#F5F2FF',
          deep: '#1C0A5A',
        },
        safe: {
          DEFAULT: '#3DA875',
          soft: '#E8F5EE',
        },
        caution: {
          DEFAULT: '#D69A32',
          soft: '#FBF3E2',
        },
        danger: {
          DEFAULT: '#E25555',
          soft: '#FCEAEA',
        },
      },
      fontFamily: {
        display: ['var(--font-family-display)'],
        body: ['var(--font-family-body)'],
        mono: ['var(--font-family-mono)'],
      },
      fontSize: {
        'display-xl': ['clamp(4.5rem, 8vw, 7rem)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        'display-l': ['clamp(3rem, 6vw, 5rem)', { lineHeight: '1.0', letterSpacing: '-0.02em' }],
        'hero-data': ['clamp(3rem, 6vw, 4.5rem)', { lineHeight: '1.0', letterSpacing: '-0.02em' }],
        'page-title': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'section-title': ['clamp(1.375rem, 2.5vw, 2rem)', { lineHeight: '1.2' }],
        'subject-title': ['clamp(1.25rem, 2vw, 1.625rem)', { lineHeight: '1.25' }],
        'body-strong': ['1.0625rem', { lineHeight: '1.5', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.5' }],
        'meta': ['0.8125rem', { lineHeight: '1.4' }],
        'micro': ['0.6875rem', { lineHeight: '1.3' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
        '24': '96px',
        '32': '128px',
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '2px',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
};

export default config;
```
