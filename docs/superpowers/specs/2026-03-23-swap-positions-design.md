# Swap Player Positions on Scoring Page

## Overview

Add a visual toggle on the scoring page that swaps the left/right positions of the two players. This is purely a display concern — scoring logic and event storage are unaffected.

## Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| State | `swapped` boolean in Scoring.tsx | Simplest possible approach |
| Persistence | None — resets on page reload | User requested visual-only |
| Button placement | Bottom action bar (alongside Restart/Undo) | Accessible, consistent with existing UI |
| Scope | Scoring.tsx columns + Scoreboard header | Both must swap to stay consistent |

## Implementation

- Add `const [swapped, setSwapped] = useState(false)` in Scoring component
- Derive display sides: `const leftSide = swapped ? "B" : "A"` / `const rightSide = swapped ? "A" : "B"`
- Use `leftSide`/`rightSide` when rendering the two-column layout (ScoreButton + AnnotationBar) and when passing team names
- Score button `onScore` callbacks must still use the real team side (A/B), not the display side
- Pass `swapped` prop to Scoreboard so it swaps name/score positions in the header
- Add swap button (⇄) in the bottom action bar between Restart and Undo
- Add translation key `swap` to en.json, zh.json, ja.json

## What Is NOT Changed

- `handleScore()` / `handleAnnotatedScore()` — always use real team sides
- Event storage — events always record real team side (A/B)
- Match state / domain logic — untouched
- ScoreButton / AnnotationBar components — receive props, no internal changes needed
