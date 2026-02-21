# Practice Tiebreak Mode — Design

## Goal

Add a "Practice" option to the "Best Of" selector on the match creation page. Practice mode is a single standalone tiebreak: first to 7 points wins, no 2-point margin required. Server rotation follows standard tiebreak rules.

## Domain Model Changes

### Types

Extend `BestOf` to include `"practice"`:

```ts
type BestOf = 1 | 3 | 5 | "practice";
```

### initMatchState

When `bestOf === "practice"`, the initial set starts directly in tiebreak mode:

```ts
game: { kind: "tiebreak", tbA: 0, tbB: 0, target: 7 }
```

### scoreTiebreak

When `ruleset.bestOf === "practice"`, the win condition changes:
- **Standard tiebreak**: first to 7 with 2-point margin
- **Practice tiebreak**: first to exactly 7, no margin required (7-6 is a valid win)

### setsNeeded

Handle `"practice"` by returning 1.

### Server rotation

Unchanged — standard tiebreak pattern (after 1st point, then every 2 points).

## UI Changes

### NewMatch page

- "Best Of" row: `[1] [3] [5] [Practice]`
- When "Practice" is selected, hide the Tiebreak selector (it's always a tiebreak)
- All other fields remain unchanged

### Scoreboard

- In practice mode, replace the sets score row with a "Practice Tiebreak" label
- Tiebreak point score display works as-is

### Scoring page

- No changes needed beyond Scoreboard adjustment
- Match end behavior unchanged (winner banner + "New Match" link)

## Testing

New Vitest test cases:
- `initMatchState` with practice mode starts in tiebreak state
- Scoring points in practice tiebreak works
- Win at exactly 7 points (7-6 is a valid win, no margin needed)
- Server rotation works in practice mode
- Match ends after practice tiebreak win (no second set created)
- `setsNeeded` returns 1 for practice mode

## Files to Modify

- `src/domain/types.ts` — extend `BestOf` type
- `src/domain/tennis.ts` — modify `initMatchState`, `scoreTiebreak`, `setsNeeded`
- `src/domain/tennis.test.ts` — add practice mode tests
- `src/ui/pages/NewMatch.tsx` — add Practice button, hide tiebreak selector
- `src/ui/components/Scoreboard.tsx` — show "Practice Tiebreak" label
