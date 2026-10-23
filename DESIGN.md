# Shipped design system

This is the visual system implemented by `index.html`, `src/App.tsx`, and
`src/styles.css` for the VIT Chennai FFCS Timetable Planner. It documents the
shipped interface, not a future redesign.

## Operate mode

The product operates as a route-led academic control room. The central idea is
that a timetable is a route through the week: the student builds a course list,
traces choices through the VIT grid, compares feasible routes, and keeps a
portable plan.

The visual language is explicitly **midnight graphite, violet route lines,
mint verified states, amber uncertainty, and tabular time marks**. It is a
dense but calm productivity dashboard: operational labels, live metrics,
source mapping, visible trade-offs, and one clear next action take priority
over decoration.

## Palette and tokens

The default theme is dark. The theme toggle sets `data-theme="light"` on the
root element and swaps the surface, text, accent, and shadow values below.

| Token | Dark | Light override |
| --- | --- | --- |
| `--bg` | `#10111a` | `#f3f2fa` |
| `--bg-deep` | `#0c0d14` | `#ebeaf4` |
| `--surface` | `#171923` | `#fff` |
| `--surface-raised` | `#1d1f2c` | `#f9f8fe` |
| `--surface-soft` | `#222433` | `#efeff8` |
| `--text` | `#edeef8` | `#191a27` |
| `--text-soft` | `#a6a8be` | `#63647a` |
| `--text-faint` | `#75788f` | `#8d8da0` |
| `--line` | `rgba(226, 229, 255, .11)` | `rgba(28, 25, 55, .10)` |
| `--line-strong` | `rgba(226, 229, 255, .18)` | `rgba(28, 25, 55, .18)` |
| `--violet` | `#a98bff` | `#6c4ad9` |
| `--violet-strong` | `#865cff` | `#5630c9` |
| `--violet-soft` | `rgba(169, 139, 255, .13)` | `rgba(108, 74, 217, .10)` |
| `--mint` | `#7de3cb` | `#218f79` |
| `--mint-soft` | `rgba(125, 227, 203, .12)` | `rgba(33, 143, 121, .10)` |
| `--amber` | `#edc16d` | `#aa720b` |
| `--amber-soft` | `rgba(237, 193, 109, .12)` | `rgba(170, 114, 11, .10)` |
| `--red` | `#ff8e9b` | `#c43d52` |
| `--red-soft` | `rgba(255, 142, 155, .12)` | `rgba(196, 61, 82, .10)` |
| `--blue` | `#82b4ff` | `#3568c8` |

Shared geometry is `--radius: 18px` with a soft `--shadow` for raised panels.
Panels, rows, controls, and alerts use smaller radii from `4px` to `15px` as
their hierarchy tightens. The app shell adds a violet radial glow at the top
right; surfaces and the sticky topbar use translucent backgrounds and borders
rather than heavy fills.

Semantic color usage is consistent: violet marks primary action, selection,
route score, and theory; mint marks verified/available states and laboratory;
amber marks uncertainty and lunch; red marks clashes, errors, and destructive
actions; faint text and neutral surfaces carry secondary information.

## Typography

- The stack is `Aptos`, `Segoe UI Variable`, system UI, and platform fallbacks;
  no webfont is loaded.
- Large page titles use a tight, heavy display treatment: `clamp(30px, 4vw,
  52px)`, `720` weight, `1.02` line-height, and `-0.055em` tracking. On small
  screens they settle at `34px`.
- Body copy is compact and readable: usually `12–14px`, with muted text and
  generous line-height for descriptions.
- Eyebrows, navigation labels, metric labels, table headers, and metadata use
  small uppercase or letter-spaced treatments (`9–10px` is common).
- Slot codes, time values, assignments, and route chips use a monospace stack
  (`ui-monospace`, `SFMono-Regular`, `Consolas`, monospace) to make the grid
  legible and comparable.
- Lucide icons provide the interface iconography. Icons reinforce labels and
  states; they are not the sole carrier of meaning.

## Layout and components

The app is a flex shell with a `248px` sidebar, a flexible main area, and a
sticky `76px` topbar. The sidebar can collapse to `78px`; the main content is
centered at `1500px` with responsive horizontal padding. The topbar carries the
`FFCS / view` breadcrumb, local-save indicator, theme toggle, and the global
route-generation action.

Navigation is grouped into **Workspace** (Dashboard, My courses, Slot planner,
Timetable, Compare schedules) and **System** (Slot reference, Settings).

Reusable visual primitives are:

- **Page intro:** uppercase eyebrow, large title, supporting description, and
  right-aligned actions.
- **Panel:** bordered, rounded, raised surface with a compact heading.
- **Buttons:** violet primary, raised-surface secondary, quiet text action, and
  small/icon variants.
- **Metrics and signals:** a five-column metric strip plus labeled signal rows
  for clash, mapping confidence, and heuristic route score.
- **Course rows/cards:** avatar/code marker, course metadata, theory/lab slot
  summary, edit action, and overflow menu.
- **Slot lanes/options:** separate theory and laboratory lanes with selected,
  clash, available, and unverified treatments.
- **Timetable:** Monday–Sunday grid, period rail, distinct theory/lab blocks,
  a non-schedulable lunch row, Week/Compact/Day control, and legend.
- **Route comparison:** ranked schedule cards, score badge, schedule metrics,
  route chips, apply action, and a preferences panel for heuristic inputs.
- **Reference/settings surfaces:** source timing and mapping tables, plan
  management, generator defaults, and export controls.

## States and feedback

The interface makes the planning state visible at the point of use:

- Empty data has dedicated illustrated/icon states with a next action: no
  courses, no plotted classes, no generated routes, no feasible route, or no
  search match.
- Loading is represented by the disabled generation button and `Searching…`
  label.
- A selected slot uses a violet border/background and a check icon. A valid
  option says `Available`; a conflict uses red border/background, an alert icon,
  and an explicit clash count/message. An unverified mapping uses dashed,
  softened treatment and a `Verify mapping` warning.
- Dashboard signals distinguish `Waiting`, `Clear`, `Reference verified`,
  review-needed, heuristic score, and conflict states with both text and icon.
- Generated routes identify the first-ranked route as `Recommended`; the
  compare view also exposes search limits and returned errors.
- Successful local actions appear as a mint toast with `role="status"`.
- Disabled controls reduce opacity and use a not-allowed cursor. Hover states
  lift or strengthen borders on actionable surfaces. Visible selections and
  active navigation use violet.

## Responsive behavior

- At `1180px`, the dashboard becomes one column; compare preferences move above
  the route list and use a three-column internal layout.
- At `860px`, the sidebar becomes a fixed off-canvas drawer with open/close
  controls. The page uses smaller padding, stacks page-intro content, changes
  the metric strip to three columns, and stacks reference/settings layouts.
- At `600px`, the topbar is `64px`; the save indicator and global generate
  button are hidden to preserve space. Content uses `15px` side padding, metrics
  use two columns, course rows wrap, forms and slot lanes become single-column,
  preferences stack, and schedule cards place Apply below their content.
- The timetable remains horizontally scrollable at narrow widths with a
  deliberate minimum grid width, preserving period/day readability. The
  compact timetable mode also reduces its column minimum and hides block names.
- Print output removes navigation, topbar, intro, alerts, toast, and empty-grid
  chrome; it switches to white surfaces, keeps the timetable full width, and
  preserves schedule-block color for printing.

## Accessibility

The shipped interface uses `lang="en"`, a viewport meta tag, semantic
`aside`/`main`/`header`/`nav`/`section`/`article` elements, native buttons and
form controls, and explicit labels for form fields. Icon-only controls have
`aria-label`s; navigation has `aria-label="Main navigation"`; toggles expose
`aria-pressed`; the course editor is a labeled modal dialog; and transient
feedback uses `role="status"`.

All keyboard-focusable buttons, inputs, selects, and textareas receive a
visible `2px` violet `:focus-visible` outline. Conflicts, warnings, theory,
laboratory, lunch, and verification states pair color with text, icons, or
legends so the color is not the only signal. Tables retain their readable
period/day labels and scroll horizontally where needed.

## Direction contract

Future visual work should preserve the contract already established by the
product brief and the shipped interface:

1. Treat the week as a legible route, not an opaque optimization result.
2. Keep the VIT reference grid authoritative: Monday–Sunday is visible, lunch
   is a hard break, theory and laboratory timings remain separate, and a lab
   remains one continuous two-period session.
3. Never hide uncertainty or invent a mapping. Unverified choices must remain
   visibly reviewable, and every conflict must be explainable in course, day,
   and time terms.
4. Preserve the operational hierarchy: course intake → slot inspection →
   timetable → route comparison → portable/exportable plan.
5. Extend the existing token system and semantic state language before adding
   new colors, surfaces, or decorative treatments.
6. Keep the product honest about heuristics: a route score is a guide, not a
   claim of global optimality.
