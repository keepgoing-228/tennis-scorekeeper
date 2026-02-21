# Match History & Point Annotation Design

## Overview

Add the ability to annotate points with a loss reason (shot-type detail) and view match history with per-match stats. Designed for personal tracking — reviewing recent matches and seeing patterns in how points are won and lost.

## Approach: New POINT_ANNOTATED Event

Uses a new `POINT_ANNOTATED` event type in the existing event stream. This fits the event-sourced architecture: events remain immutable, annotations are optional metadata that don't affect match state, and undo/redo works naturally.

## Domain Model Changes

### Point Loss Reasons (enum)

- `DOUBLE_FAULT` — server double-faulted
- `ACE` — server hit an ace (point lost by receiver)
- `FOREHAND_ERROR` — unforced forehand error
- `BACKHAND_ERROR` — unforced backhand error
- `VOLLEY_ERROR` — error at the net
- `OUT_OF_BOUNDS` — shot went out
- `NET_ERROR` — shot hit the net
- `WINNER` — opponent hit an unreturnable shot

### New Event Type: POINT_ANNOTATED

```typescript
{
  matchId: string
  timestamp: number
  type: "POINT_ANNOTATED"
  pointEventIndex: number  // index into effective events array
  reason: PointLossReason
}
```

### Replay Behavior

- `POINT_ANNOTATED` events are skipped during match state replay — they do not affect `MatchState`
- Only read when computing stats
- Undoing a `POINT_WON` orphans its annotation; orphaned annotations are ignored during stats computation (only annotations linked to effective points are counted)

## Scoring UI Changes

After awarding a point, a small annotation bar appears below the score buttons showing reason options as tappable chips/pills (Double Fault, Ace, FH Error, BH Error, Volley, Out, Net, Winner).

Key behaviors:

- Shows reasons for the most recent point only
- Tapping a reason saves the `POINT_ANNOTATED` event and dismisses the bar
- Scoring the next point without annotating moves the bar to the new point — previous point remains unannotated
- Undo dismisses/updates the bar accordingly
- No modal, no blocking — scoring speed is unaffected

Visual placement: below the two big score buttons, above other controls.

## Match History Page

### Route

`/history` — accessible from the home/match creation page via a "Match History" button.

### List View

- All completed matches in reverse chronological order
- Each row shows:
  - Team/player names
  - Final set scores (e.g., "6-4, 3-6, 7-5")
  - Winner indicator
  - Date played
  - Match type label (e.g., "Practice Tiebreak", "Best of 3")
- Cancelled/restarted matches excluded (only completed matches)
- Practice tiebreak matches included alongside regular matches

### Match Detail / Stats

Tapping a match expands or navigates to a detail view with aggregate stats per team:

- Aces
- Double faults
- Forehand errors
- Backhand errors
- Volley errors
- Out of bounds
- Net errors
- Winners
- Unannotated points
- Total points won

No cross-match aggregation — each match stands on its own.

## Data & Storage

No IndexedDB schema changes. The existing `events` table stores events by matchId with a type field. `POINT_ANNOTATED` is a new event type value.

### Stats Computation

A pure function `computeMatchStats(events: MatchEvent[]) → MatchStats` that:

1. Replays events to get effective events list (reuses existing `getEffectiveEvents`)
2. Filters for `POINT_WON` events and pairs with `POINT_ANNOTATED` events by index
3. Aggregates counts per team per reason
