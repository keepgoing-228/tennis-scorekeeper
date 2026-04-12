# Doubles Per-Player Tracking

## Overview

Enhance the doubles match scoring page to track individual player performance. Currently, all scoring operates at the team level — this feature adds optional per-player attribution on annotated points, a stats drawer showing per-player breakdowns, and derived individual statistics.

Server rotation remains at the team level (no change).

## Approach

Extend the existing `PointWonEvent` payload with an optional `playerId` field. When a doubles match annotation is made and the user selects a player, the event stores `{ team, annotation, playerId }`. Events without `playerId` remain valid — fully backwards compatible with existing matches.

## Domain & Data Changes

### PointWonEvent payload extension

```typescript
payload: {
  team: TeamSide;
  annotation?: PointLossReason;
  playerId?: string;  // NEW — optional, only set for annotated doubles points
}
```

- `playerId` is only populated when the match is doubles AND the user selects a player after choosing an annotation.
- Existing events (singles matches, unattributed doubles points) remain unchanged — no migration needed.
- `replay()` logic is unaffected since scoring still operates on `team`.

### PlayerStats type

```typescript
type PlayerStats = {
  aces: number;
  doubleFaults: number;
  forehandWinners: number;
  backhandWinners: number;
  forehandErrors: number;
  backhandErrors: number;
  totalWinners: number;   // aces + forehandWinners + backhandWinners
  totalErrors: number;    // doubleFaults + forehandErrors + backhandErrors
  winnerErrorRatio: number; // totalWinners / totalErrors (Infinity if no errors, 0 if no winners and no errors)
};
```

### computeMatchStats extension

Add an optional `playerStats` map to the return type:

```typescript
playerStats?: Record<string, PlayerStats>;
```

- Built by filtering `POINT_WON` events that have `playerId` set and aggregating by annotation type.
- Only computed when `matchType === "doubles"`.
- Keyed by `playerId`.

## Player Attribution UI Flow

When scoring a doubles match with an annotation:

1. User taps a team side (same as today).
2. User taps an annotation (Ace, Forehand Error, etc.).
3. **New step:** A popup appears showing the two players on the relevant team.
   - For **winner annotations** (Ace, Forehand Winner, Backhand Winner): shows the two players on the scoring team — "Who hit it?"
   - For **error annotations** (Double Fault, Forehand Error, Backhand Error): shows the two players on the team that made the error — "Who made the error?"
4. User taps a player name, or taps "Skip" to dismiss.
5. Point is recorded with or without `playerId`.

### Key details

- The popup only appears in **doubles matches** — singles is completely unchanged.
- Two large, easy-to-tap buttons with player names.
- A "Skip" dismiss option so you're never forced to attribute.
- No auto-timeout — stays until the user acts (avoids accidental skips during fast play).
- Plain point taps (no annotation) do NOT trigger the popup — they record at team level as today.

## Stats Drawer

A slide-up drawer panel accessible from the scoring page, showing per-player stat breakdowns for doubles matches only.

### Trigger

A stats button in the scoring page header area. Tapping it slides up a drawer overlay.

### Content structure

For each team (A and B), each player is shown in a card with:

- **Summary row:** Aces, Total Winners, Total Errors (large numbers)
- **Detail row:** FH Winners, BH Winners, FH Errors, BH Errors
- **Derived:** Winner/Error Ratio

Teams are grouped and color-coded.

### Behavior

- Tap outside or swipe down to dismiss.
- Updates live as points are scored.
- Only appears for doubles matches (button hidden in singles).

## Scope boundaries

- Server rotation stays at team level — no per-player serve tracking.
- Match history page is not changed in this feature (per-player stats only shown during live match in the stats drawer).
- No changes to singles match flow.
- Existing match data is fully compatible — no migration.
