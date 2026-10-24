# VIT Chennai FFCS Timetable Planner

A local-first React + TypeScript planner for VIT Chennai's Fully Flexible Credit System. It keeps theory and laboratory slot namespaces separate, preserves the reference image's different period timings, and treats each lab choice as one two-period session.

## What is included

- Course manager with theory, lab, and linked Theory + Lab records.
- Paste-import for course rows and local browser autosave.
- Clickable slot map: select any mapped theory or two-period lab, then see theory/lab clashes highlighted and explained immediately.
- Monday–Sunday timetable with a visible lunch break and two-period lab blocks.
- Bounded backtracking generator that returns multiple clash-free alternatives.
- Transparent heuristic route scoring for gaps, free days, early/late classes, and weekend classes.
- Schedule comparison, apply/restore flows, named plans, and duplicate plans.
- CSV, JSON, printable browser output (use **Print / PDF → Save as PDF**), and recurring `.ics` calendar export.
- Slot reference page sourced from `Screenshot 2026-10-23 193410.png`.
- Responsive dark/light UI with keyboard-visible focus states.
- GitHub Actions workflow for GitHub Pages project-site deployment.

## Development

Requirements:

- Node.js 20 or newer
- npm 10 or newer

Install dependencies and start the Vite dev server:

```bash
npm ci
npm run dev
```

The app is local-first and does not require a backend, account, API key, or environment variable.

## Checks

Run the scheduling engine tests:

```bash
npm test
```

Run the TypeScript check and production build:

```bash
npm run build
```

Preview the production bundle locally:

```bash
npm run preview
```

## GitHub Pages

The Vite base path is computed from `GITHUB_REPOSITORY` during GitHub Actions builds. The workflow in `.github/workflows/deploy.yml`:

1. Installs from `package-lock.json`.
2. Runs `npm run build`.
3. Uploads `dist/` as a Pages artifact.
4. Deploys with the official Pages action.

To use it:

1. Create or select a GitHub repository for this project.
2. Push the project to the `main` branch.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.
4. Push again or run the workflow manually.

The project-site URL will be:

```text
https://USERNAME.github.io/REPOSITORY/
```

No deployment is claimed until the GitHub Actions run and the resulting URL are verified.

## Reference-data policy

The supplied screenshot is treated as the source of truth for the initial grid:

- Theory uses one period per meeting.
- Lab starts use the next period as the second half of the same session.
- Theory and lab timings are kept distinct during conflict checks.
- Lunch is structurally non-schedulable.
- `L61`–`L70` are intentionally flagged as unobserved because they are not visible in the supplied image. They are not fabricated into usable slots.
- Legible course/room metadata from the screenshot is preserved in `src/data/slots.ts`.

If official FFCS slot data becomes available, update `src/data/slots.ts` and add regression tests before changing the UI.

## Main source areas

```text
src/data/slots.ts             Canonical timings and screenshot mapping
src/engine/scheduling.ts      Conflict detection, metrics, generator, scoring
src/engine/scheduling.test.ts Engine correctness tests
src/utils/persistence.ts      Local storage and export formats
src/App.tsx                   Views and user flows
src/styles.css                Responsive design system
.github/workflows/deploy.yml  GitHub Pages deployment
```
