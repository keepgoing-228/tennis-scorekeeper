# First-to-3-Games Practice Mode Design

## Problem

The app only has one practice mode (standalone tiebreak). Users want a practice mode that uses normal game scoring where the first player to win 3 games wins.

## Design

### Ruleset change

Add optional `practiceMode` field to `Ruleset`:

```typescript
export type Ruleset = {
  bestOf: BestOf;
  tiebreak: "none" | "7pt";
  matchType: "singles" | "doubles";
  practiceMode?: "tiebreak" | "first_to_3";
};
```

`practiceMode` is only relevant when `bestOf === "practice"`. Defaults to `"tiebreak"` for backward compatibility.

### UI: NewMatch page

Selecting "Practice" reveals a sub-selector for practice mode:

```
Best Of:        [ 1 ] [ 3 ] [ 5 ] [ Practice ]
Practice Mode:  [ Tiebreak ] [ First to 3 Games ]
```

Sub-selector hidden when bestOf is not "practice".

### Scoring logic (practiceMode === "first_to_3")

- Single set with normal game scoring (0/15/30/40/deuce/AD)
- Server alternates after each game
- First player to win 3 games wins the match
- No tiebreak at 3-3 — not reachable since match ends at 3 games

### No changes needed

- Stats, annotations, match history all work unchanged
- Event model unchanged
