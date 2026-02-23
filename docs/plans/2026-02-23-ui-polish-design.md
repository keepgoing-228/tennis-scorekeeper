# UI Polish Design

## Goal

Make the app feel more polished and modern — closer to a native app — while keeping the dark theme and Tailwind-only approach (no new dependencies).

## Summary of Changes

### Scoring Page

1. **Remove game point from Scoreboard** — only show set scores and team names with server indicator. The ScoreButtons already display the current game point.

2. **Score buttons — subtle team distinction:**
   - Replace blue-700 vs red-700 with a more harmonious palette
   - Team A: cool tint (slate/blue-gray base)
   - Team B: warm tint (stone/warm-gray base)
   - Active/pressed states use a more pronounced but cohesive color shift

3. **Bottom action bar (Restart + Undo):**
   - Better rounded corners and spacing
   - Restart: subtle destructive styling (not bright red)
   - Undo: icon alongside text

4. **Match finished overlay:**
   - Rounded card style instead of full-width banner

### New Match Page

1. **Title: "Tennis Scorekeeper"** instead of "New Match"

2. **Form styling:**
   - Larger input padding, subtle focus rings
   - Segmented control style for toggle groups (Best Of, Tiebreak, Match Type, First Server) — proper rounded-l/rounded-r edges, connected buttons
   - Better visual grouping of form sections

3. **Start Match button:** more prominent with refined hover/active states

4. **Match History link:** repositioned to a more natural location

### Match History Page

1. **Match cards:** better rounded corners, subtle shadow/border, cleaner layout
2. **Stats expansion:** better table styling with alternating row backgrounds
3. **Delete button:** cleaner positioning and hover state
4. **Empty state:** more inviting styling
5. **Navigation:** consistent link styling

## Approach

Tailwind-only refinement. Upgrade existing utility classes across all components. No new dependencies, no custom CSS beyond what Tailwind provides.

## Files to Modify

- `src/ui/components/Scoreboard.tsx` — remove game point display
- `src/ui/components/ScoreButton.tsx` — new color scheme
- `src/ui/components/AnnotationBar.tsx` — minor polish
- `src/ui/pages/Scoring.tsx` — bottom bar and overlay styling
- `src/ui/pages/NewMatch.tsx` — title, form, and button styling
- `src/ui/pages/MatchHistory.tsx` — card, table, and layout styling
