# Design — Rules for AI Agents

- /packages/ui is the single source of truth for all UI.
- Always use shared shadcn components from /packages/ui.
- Do not override component styles with className.
- Do not introduce custom border radii, spacing, colours, shadows, or other visual deviations.
- Corners are rounded, from the scale only: `rounded-sm` (6px) for the smallest
  controls, `rounded-md` (8px) for inputs, `rounded-lg` (14px) for popovers,
  dialogs and menus, `rounded-xl` (20px) for glass surfaces. Buttons, toggles and
  tabs are `rounded-full`. Never a literal radius at the call site.
- `rounded-none` is still correct in one case: an element that must join its
  neighbour edge to edge. The input inside an input group, the middle cells of
  a selected date range, and the drawer handle are the existing examples.
- If a component needs a new variant or style, implement it in /packages/ui so the entire application stays consistent.

## Colour

The Lugh palette. Dark is the default theme: a near-black violet ground (`#100E18`)
lit by Roxo Profundo glows, translucent glass surfaces (`.glass-surface`), and the
animated line waves of `AmbientBackground`. Light is Papel (`#FAF9F7`) with the
same structure.

**Only two things are filled**: `primary` for the action you want, `destructive`
for the one you cannot undo. `--primary` is Roxo Primário (`#3E3585`) in light and
Lavanda (`#8F80F7`) in dark, because Roxo Primário has too little contrast on the
dark ground. Coral (`--chart-4`) only marks delay and loss.

Deal stages use `--stage-1` to `--stage-4`, which grow lighter as a deal moves
toward close. Type is Inter for text and JetBrains Mono for labels and figures.
Buttons, toggles and tabs are pills. `.reveal` fades surfaces in as they scroll
into view, and every motion respects `prefers-reduced-motion`.
