# Forensic Audit: V1 Medical Leave Implementation

## 1. Files & Functions Involved
- `js/medical-leave.js`: Contains the UI modal guide and the HTML/PDF letter generator.
- `js/calculator.js` (`applyML`): Contains the mathematical logic for the +5 rule.
- `js/app.js` (`applyMLGlobal`): Loops through all subjects, applies the +5 math, and mutates storage.
- `index.html`: Contains the global "Apply ML" toolbar button.

## 2. The Actual Mathematical Behavior
The V1 implementation of Medical Leave did not calculate anything based on dates, timetables, or actual missed classes. 
When triggered, it executed a blanket `attended = attended + 5` and `delivered = delivered + 5` on **every single subject globally**. 
Because it permanently mutated these base counters, multiple clicks would stack indefinitely (e.g., clicking twice gave +10 classes to all subjects).

## 3. Provenance of the "+5 Rule"
The +5 mathematical hack is based on a misapplication of a university rule. 
The V1 `medical-leave.js` guide explicitly documents: 
> *"Minimum 5 working days of absence — per mentor guidance, this is when an ML application actually gets processed."*

**Conclusion:** The university rule is a **duration constraint** (you must be sick for at least 5 days to be eligible for ML). The V1 developer conflated this "5 days" rule with "5 classes", leading to the lazy blanket math implementation, likely because V1 lacked a calendar-aware timetable engine.

## 4. V1 Data Model & Persistence
V1 did not store an actual "Leave Record". It destructively mutated the canonical `attended` and `delivered` integers in `localStorage`. It appended a generic `{ type: 'ml' }` to a history log, but this was a decoupled string, not a reproducible state model. 

## 5. Medical Leave Letter Generator
The V1 system included a highly specific, form-fillable letter generator that output a print-ready HTML page (designed to be saved as PDF). 
It addressed the Dean, routed through the Mentor, and included blanks for the student's name, roll number, dates of absence, disease, and a parent/guardian signature block.

## 6. Recommended V2 Adaptation
V2 must **strictly avoid** porting the +5 blanket math. 

Instead, V2 should implement Medical Leave as a specialized wrapper around the canonical Domain-Driven Schedule Exception Engine (the exact same engine we just validated for Bulk Duty Leave):

1.  **Workflow:** Provide a Start Date and End Date selector.
2.  **Constraint Check:** Validate if the date range encompasses at least 5 days. If not, show the mentor warning before proceeding.
3.  **Calculation:** Use `getScheduledSlotsForDate()` to find exactly which timetable slots were missed during those dates.
4.  **Logging:** Log `status: "dl"` records for the specific slots, utilizing the proven idempotent persistence mechanism.
5.  **Letter Generation:** Port the official V1 letter generator (HTML to PDF) as the final step of the workflow.

This perfectly preserves canonical V2 attendance semantics (`attended` excludes DL, domain-owned models) while fulfilling the actual intent of the university's ML policy.
