# Annotation-Based Scoring Design

## Problem

The current flow requires two steps: tap a score button, then optionally annotate the point. This is cumbersome during a live match. Annotations should be a primary way to score, not an afterthought.

## Design

### UI Layout

Two-column layout, one column per player. Each column contains:

1. **Score button** (top) — fallback for quick unannotated points
2. **Winner-type annotation chips** — Ace, Winner
3. **Error-type annotation chips** — Double Fault, FH Error, BH Error, Volley Error, Out of Bounds, Net Error

Annotation chips are always visible. The old post-score annotation bar is removed.

```
┌─────────────────┬─────────────────┐
│   [Player A ▲]  │   [Player B]    │
│                 │                 │
│  Ace            │  Ace            │
│  Winner         │  Winner         │
│                 │                 │
│  Double Fault   │  Double Fault   │
│  FH Error       │  FH Error       │
│  BH Error       │  BH Error       │
│  Volley Error   │  Volley Error   │
│  Out of Bounds  │  Out of Bounds  │
│  Net Error      │  Net Error      │
└─────────────────┴─────────────────┘
```

### Scoring Logic

When an annotation chip is tapped on Player X's column:

- **Ace / Winner** — point awarded to Player X
- **All error types** — point awarded to opponent

### Event Model

- Add optional `annotation` field to the `POINT_WON` event type
- When scoring via annotation chip: `POINT_WON` event includes the annotation inline
- When scoring via fallback score button: `POINT_WON` event has no annotation
- Remove the `POINT_ANNOTATED` event type (no longer needed)

### Stats Computation

`computeMatchStats()` reads annotations from the `annotation` field on `POINT_WON` events instead of from separate `POINT_ANNOTATED` events.

### Removals

- Post-score annotation bar component and show/hide logic
- `POINT_ANNOTATED` event type
- Related event creation and replay logic for `POINT_ANNOTATED`
