# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: React + TypeScript + Vite + Tailwind-style CSS, kept lightweight for GitHub Pages deployment.

## Users

The primary user is a VIT Chennai student planning next semester's FFCS registration from a laptop or phone. They need to explore course slot combinations, avoid timetable clashes, and choose a practical weekly schedule before registration.

## Product Purpose

VIT Chennai FFCS Timetable Planner lets a student enter intended theory and laboratory courses, assign or explore eligible slots, detect exact time overlaps, compare feasible weekly schedules, and save/export a preferred plan locally. Success means the student can trust that a displayed plan is clash-free and understand why a rejected combination cannot work.

## Positioning

The planner treats the supplied VIT theory and lab timetable as a first-class scheduling dataset: theory slots occupy one period while lab slots occupy exactly two consecutive periods, with the distinct theory/lab timings preserved in conflict calculations.

## Operating Context

The student works from VIT slot codes such as A1, F1, L31, and L32, may have pasted or CSV-imported course options, and needs a weekly Monday–Sunday view that includes Saturday and Sunday. The reference screenshot at `Screenshot 2026-10-23 193410.png` is the source of truth for the initial visible slot grid and mappings.

## Capabilities and Constraints

- Add, edit, duplicate, delete, import, and export courses.
- Assign theory and lab components independently, including linked Theory + Lab courses.
- Detect theory/theory, lab/lab, and theory/lab overlaps using actual day and time intervals.
- Treat lunch as a non-schedulable break.
- Generate multiple feasible schedules with bounded search and heuristic scoring; do not claim global optimality unless established.
- Preserve unverified/uncertain mappings visibly rather than silently inventing them.
- Persist plans in browser storage by default; no backend, account, paid service, or secret is required.
- Deploy as a Vite project site under a GitHub Pages repository path.

## Brand Commitments

Use the product name “VIT Chennai FFCS Timetable Planner.” The brief calls for a premium academic productivity dashboard with a purple/violet accent, dark/light theme toggle, clear typography, responsive layout, and accessible interaction.

## Evidence on Hand

- `Screenshot 2026-10-23 193410.png` is the supplied timetable reference.
- The reference visibly contains theory and lab rows for Monday–Sunday, a lunch break, the exact differing theory/lab periods, theory slot codes, lab slot codes, and a small set of course/room metadata.
- No external course catalogue, faculty directory, or official machine-readable slot file was supplied; the interface must make manually editable/unverified data explicit.

## Product Principles

1. Scheduling correctness outranks visual decoration.
2. Every conflict should be explainable in course, day, and time terms.
3. The student should be able to explore alternatives without losing a known-good plan.
4. Uncertainty is visible and repairable, never silently fabricated.
5. A plan is useful only when it can be restored and taken outside the app.

## Accessibility & Inclusion

The web app should support keyboard navigation, visible focus, readable contrast, responsive layouts for small screens, non-color-only conflict indicators, and clear empty/error/success states.
