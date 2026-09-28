# Presynce V2 Design Language Architecture

## Product Philosophy: Attendance Intelligence, Not Dashboard

Presynce V2 departs fundamentally from traditional administrative SaaS patterns. Standard academic software treats attendance data as static records presented inside tabular containers or card grids—an administrative approach focused on retrospective logging. Presynce V2 is engineered as an active intelligence layer. It treats attendance not as a static record of past compliance, but as a live trajectory governed by physical laws: current location, forward projection, and decision boundaries.

The core interface hypothesis is that students do not want a reporting dashboard; they require immediate situational awareness and actionable leverage. A traditional dashboard forces the user to scan multiple rows, parse raw percentages, compute dynamic fractions mentally, and evaluate margin safety independently. Presynce V2 collapses this mental processing into singular, high-contrast decision surfaces. The system computes exact freedom limits (e.g., "CAN SKIP 3") or exact recovery costs (e.g., "NEEDS 4"), translating complex attendance math into physical thresholds, spatial trajectories, and immediate decision feedback.

```
       [ TRADITIONAL DASHBOARD ]                   [ PRESYNCE V2 INTELLIGENCE ]
+------------------------------------+        +------------------------------------+
|  Table: 34 / 42 (80.95%)           |        |  DBMS 101       CAN SKIP 3         |
|  Status: Safe                      |   vs   |  Threshold: 75%  [===|----o--]       |
|  [View Log] [Download CSV]         |        |  Action: Skip today -> Still Safe |
+------------------------------------+        +------------------------------------+
```

## Visual Source of Truth: Lab A (Kinetic Editorial)

The visual design system of Presynce V2 is strictly derived from Lab A (Kinetic Editorial). Lab A establishes a tactile, physical paper-and-ink metaphor heightened by structural architectural gridlines and deliberate typographic scale contrast. 

Lab A explicitly rejects modern software visual clichés: soft drop shadows, rounded pill containers, heavy background gradients, blurred glassmorphism overlays, and decorative accent colors. Instead, the interface relies on high contrast, strict geometric precision, 0px border radii, thin 1px hairline rules, structural grid alignment, and functional monochromatic hierarchy punctuated by a single interaction color (Presynce Violet).

## Five Governing Principles

### 1. Structural Paper and Ink Foundation
The UI canvas is modeled as an engineering blueprint or editorial broadsheet. The background is warm structural paper (`#F5F2EC`), not sterile clinical white. Text and core graphical elements are rendered in deep carbon ink (`#11100F`). All structural divisions rely on explicit 1px hairline borders (`rgba(17,16,15,0.10)`) aligned to a persistent 4rem (64px) underlying architectural grid.

### 2. High Typographic Scale Contrast
Information hierarchy is established primarily through typographic scale, weight, and spatial placement rather than container boxes or background shading. The display metrics use extreme scale contrast (spanning from 7rem display numbers down to 0.6875rem micro metadata), leveraging font weight and letter spacing to guide scanning without visual clutter.

### 3. Purposeful Non-Decorative Color
Color carries absolute semantic meaning. Presynce V2 strictly forbids decorative color usage. Neutral paper and ink represent environment and historical reality. Presynce Violet (`#5B35E8`) signifies active interaction, live state, current focus, and system intelligence. Semantic green, amber, and coral are reserved strictly for safety status evaluations.

### 4. Cardless Spatial Composition
The interface minimizes enclosed card containers. Information blocks are separated by negative space, baseline alignment, and thin structural divider lines. By removing nested background containers, the UI achieves maximum spatial clarity, high density without visual noise, and direct focus on data typography.

### 5. Physical Motion as State Transmission
Motion is never ornamental. Animation in Presynce V2 follows physical spring dynamics to reflect state changes, dynamic calculations, projection recalculations, and committed decisions. Elements do not fade aimlessly; nodes travel across physical threshold lines, and projected states ghost forward to visualize consequences before user commitment.

## Typography Architecture

Presynce V2 implements a three-family typographic system. Each font family is assigned a distinct functional domain within the application to enforce immediate visual differentiation between context, narrative, and tabular numeric data.

```
+-----------------------------------------------------------------------------------+
|  Display & Hero Numbers      | Manrope (Weights: 700 Bold, 800 ExtraBold)         |
|  Body, UI Labels & Headings  | IBM Plex Sans (Weights: 400 Regular, 600 SemiBold) |
|  Numeric Data & Timestamps   | IBM Plex Mono (Weights: 500 Medium, 600 SemiBold)  |
+-----------------------------------------------------------------------------------+
```

Manrope is utilized exclusively for large display headings, page hero titles, and high-impact freedom numbers (`display-xl`, `display-l`, `hero-data`). Its modern, geometric construction and tight aperture provide strong visual authority.

IBM Plex Sans serves as the primary workhorse for UI text, section headers, decision descriptions, navigation items, and body copy. Its technical, neutral grotesque structure ensures high legibility across desktop and mobile screens.

IBM Plex Mono is required for all attendance metrics, fractions, percentages, time ranges, and tabular numeric data. Using a dedicated monospace family guarantees consistent numeric alignment during live projection updates, prevents layout shift during counter animations, and communicates scientific precision.

```css
/* Typography Token Declarations */
:root {
  --font-display: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

## Spacing and Grid Philosophy

The spatial framework of Presynce V2 is rooted in an 8px base spacing scale combined with a 64px (4rem) macro architectural grid. All padding, margin, height, and width values must be integer multiples of 4px or 8px.

```
Base Grid Units: 4px | 8px | 12px | 16px | 24px | 32px | 48px | 64px | 96px | 128px
```

The underlying 64px architectural grid is optionally visualized on screen using a subtle background pattern (`rgba(17,16,15,0.04)`). Components align their outer edges and vertical axes directly to these gridlines. This geometric discipline eliminates arbitrary offsets, creates clear structural alignment across columns, and reinforces the editorial blueprint aesthetic.

## Color Semantics and Discipline

Color in Presynce V2 is governed by strict semantic constraints. Color must never be applied for visual decoration, aesthetic fill, or accent branding on non-interactive elements.

```
+-----------------------------------------------------------------------------------+
| Color Role      | Hex / Value           | Application Domain                      |
+-----------------+-----------------------+-----------------------------------------|
| Paper           | #F5F2EC               | Application canvas background           |
| Surface         | #FAF8F3               | Dynamic focus surfaces, elevated panels |
| Ink             | #11100F               | Primary text, structural rules, icons   |
| Ink Secondary   | #69655F               | Subtitles, inactive labels, borders     |
| Ink Tertiary    | #9A968F               | Micro metadata, timestamps, grid lines  |
| Line            | rgba(17,16,15,0.10)   | Hairline structural rules               |
| Grid            | rgba(17,16,15,0.04)   | Canvas background structural grid lines |
| Presynce Violet | #5B35E8               | Interactive state, active focus, current|
| Safe            | #3DA875               | Margin >= threshold (Freedom zone)      |
| Caution         | #D69A32               | Margin within 1-2 classes of threshold  |
| Danger          | #E25555               | Margin below threshold (Deficit zone)   |
+-----------------------------------------------------------------------------------+
```

- **Paper (`#F5F2EC`)**: Represents the physical environment. All screens share this base surface.
- **Ink (`#11100F`)**: Represents physical reality—actual attended classes, committed states, active text.
- **Presynce Violet (`#5B35E8`)**: Represents Presynce intelligence, live focus, active selection, and system interactive controls.
- **Semantic Green (`#3DA875`)**: Applied exclusively to positive attendance readings where safety margin is comfortably above minimum requirement (e.g., "CAN SKIP 3").
- **Semantic Amber (`#D69A32`)**: Applied exclusively to warning states where safety margin is exactly at boundary or within 1 class of deficit.
- **Semantic Coral (`#E25555`)**: Applied exclusively to deficit states where attendance is below requirement (e.g., "NEEDS 4").

## Whitespace Philosophy: Negative Space as Structure

In Presynce V2, whitespace is not empty screen real estate waiting to be filled with widgets or containers; it is an active structural element used to create emphasis, group related content, and establish rhythm.

By removing card borders and background container boxes, negative space becomes the primary separator between UI sections. Large vertical margins (64px to 128px) separate major environmental blocks (such as the Hero situational awareness section from the Unresolved Action section). Tight spatial grouping (4px to 12px) binds titles to their immediate mono values. This contrast between expansive structural space and tight internal grouping creates a readable layout.

## Composition Principles: Asymmetry, Scale Contrast, Editorial Tension

Layouts in Presynce V2 are intentionally asymmetric to avoid generic centered dashboard symmetry. 

1. **Asymmetric Grid Split**: Primary hero sections utilize an asymmetric 7:5 or 8:4 column layout on desktop. The left primary column houses high-impact editorial statements and primary freedom numbers; the right secondary column houses precise numeric breakdowns, threshold progress bars, and historical context.
2. **Scale Contrast**: Extremely large typography (`display-xl` at 7rem) is positioned immediately adjacent to micro mono metadata (`micro` at 0.6875rem). This scale contrast establishes an immediate visual focus point while preserving detailed technical context without intermediate font size bloat.
3. **Editorial Tension**: Structural hairline rules (`1px solid rgba(17,16,15,0.10)`) cut across asymmetric columns, anchoring disparate visual elements to common horizontal baselines. The resulting layout feels calculated, structured, and authoritative.
