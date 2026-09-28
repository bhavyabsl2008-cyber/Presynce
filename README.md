# Presynce V2

Attendance intelligence platform for Chitkara University CSE students.
A complete, from-scratch rebuild of the production V1 app, achieving a full structural, architectural, and visual overhaul.

## V2 Status: Completed ??

Presynce V2 has officially reached its release milestone. The architecture, UI/UX, and data engine are stable, verified, and complete.

### Key V2 Features
- **Attendance Intelligence Engine**: Advanced attendance simulations (Attend/Skip) with flawless fractional math, ensuring accurate projections without mutating canonical data.
- **Chalkpad Integration**: Always-on background sync with the official Chalkpad API, importing canonical delivered, attended, duty leaves (DL), and medical leaves (ML).
- **Editorial Design Language (Lab A)**: A highly polished, paper-and-ink aesthetic utilizing IBM Plex Mono, Manrope, and semantic visual tokens for an elevated academic tool experience.
- **Advanced Leave Workflows**: 
  - **Duty Leave**: Granular, single-class selection supporting seamless timetable integration.
  - **Medical Leave**: Comprehensive multi-day date range support, strictly enforcing university 5-working-day requirements and projecting accurate impacts across scheduled classes. Generates formatted, print-ready applications.
- **The Today Experience**: A timeline-driven, day-centric environment that filters noise and focuses purely on immediate scheduled classes and near-term attendance consequences.
- **Pristine Timetable Architecture**: Distinct core schedule management vs. daily active class views.

## Running locally

`ash
npm install
npm run dev
`

Open [http://localhost:3000](http://localhost:3000).

## Testing & Build

`ash
npm test
npm run build
`
