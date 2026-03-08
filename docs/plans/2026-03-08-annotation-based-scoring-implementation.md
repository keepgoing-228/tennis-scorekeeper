# Annotation-Based Scoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge annotation and scoring into a single action — tapping an annotation chip scores the point automatically for the correct player.

**Architecture:** Add optional `annotation` field to `POINT_WON` events, remove `POINT_ANNOTATED` event type entirely. Restructure the scoring page into a two-column layout where each player has a score button and annotation chips.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Update types to add annotation to POINT_WON and remove POINT_ANNOTATED

**Files:**
- Modify: `src/domain/types.ts:80-83` (PointWonEvent)
- Modify: `src/domain/types.ts:112-118` (remove PointAnnotatedEvent)
- Modify: `src/domain/types.ts:120-126` (MatchEvent union)

**Step 1: Add optional annotation to PointWonEvent**

Change `PointWonEvent` (line 80-83) from:

```typescript
export type PointWonEvent = BaseEvent & {
  type: "POINT_WON";
  payload: { team: TeamSide };
};
```

to:

```typescript
export type PointWonEvent = BaseEvent & {
  type: "POINT_WON";
  payload: { team: TeamSide; annotation?: PointLossReason };
};
```

**Step 2: Remove PointAnnotatedEvent type**

Delete lines 112-118 (the `PointAnnotatedEvent` type).

**Step 3: Update MatchEvent union**

Change:

```typescript
export type MatchEvent =
  | MatchCreatedEvent
  | PointWonEvent
  | UndoEvent
  | RedoEvent
  | MatchEndedEvent
  | PointAnnotatedEvent;
```

to:

```typescript
export type MatchEvent =
  | MatchCreatedEvent
  | PointWonEvent
  | UndoEvent
  | RedoEvent
  | MatchEndedEvent;
```

**Step 4: Verify types compile**

Run: `bun run build 2>&1 | head -30`
Expected: Type errors in files that still reference `PointAnnotatedEvent` — this is expected and will be fixed in subsequent tasks.

**Step 5: Commit**

```bash
git add src/domain/types.ts
git commit -m "refactor: add annotation field to POINT_WON, remove POINT_ANNOTATED type"
```

---

### Task 2: Update domain logic and tests

**Files:**
- Modify: `src/domain/tennis.ts:211-224` (getEffectiveEvents)
- Modify: `src/domain/tennis.ts:277-307` (computeMatchStats)
- Modify: `src/domain/tennis.test.ts`

**Step 1: Write failing tests for new computeMatchStats behavior**

In `src/domain/tennis.test.ts`, replace the `makePointAnnotatedEvent` helper (line 409-418) and update the test helpers:

Update `makePointWonEvent` (line 266-275) to accept optional annotation:

```typescript
function makePointWonEvent(matchId: string, seq: number, team: TeamSide, annotation?: PointLossReason): PointWonEvent {
  return {
    eventId: `evt-${seq}`,
    matchId,
    createdAt: new Date().toISOString(),
    seq,
    type: "POINT_WON",
    payload: annotation ? { team, annotation } : { team },
  };
}
```

Delete the `makePointAnnotatedEvent` helper function (lines 409-418).

Replace the `"POINT_ANNOTATED in replay"` describe block (lines 420-442) with:

```typescript
describe("annotation in replay", () => {
  it("ignores annotation field during replay (does not affect scoring)", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A", "ACE"),
      makePointWonEvent("m1", 2, "B", "FOREHAND_ERROR"),
    ];
    const state = replay(events);
    expect(state.sets[0].game).toMatchObject({ pointsA: 15, pointsB: 15 });
  });
});
```

Replace the `"computeMatchStats"` describe block (lines 444-484) with:

```typescript
describe("computeMatchStats", () => {
  it("computes stats from inline annotations on POINT_WON events", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A", "ACE"),
      makePointWonEvent("m1", 2, "B", "FOREHAND_ERROR"),
      makePointWonEvent("m1", 3, "A"),
    ];
    const stats = computeMatchStats(events);

    expect(stats.A.totalPointsWon).toBe(2);
    expect(stats.B.totalPointsWon).toBe(1);
    expect(stats.A.ACE).toBe(1);
    expect(stats.B.FOREHAND_ERROR).toBe(1);
    expect(stats.A.unannotated).toBe(1);
    expect(stats.B.unannotated).toBe(0);
  });

  it("ignores annotations for undone points", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A", "ACE"),
      makeUndoEvent("m1", 2, "evt-1"),
    ];
    const stats = computeMatchStats(events);
    expect(stats.A.totalPointsWon).toBe(0);
    expect(stats.A.ACE).toBe(0);
  });

  it("returns zero stats when no points scored", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
    ];
    const stats = computeMatchStats(events);
    expect(stats.A.totalPointsWon).toBe(0);
    expect(stats.B.totalPointsWon).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun run test 2>&1`
Expected: Tests fail because `computeMatchStats` still looks for `POINT_ANNOTATED` events.

**Step 3: Update getEffectiveEvents**

In `src/domain/tennis.ts`, update `getEffectiveEvents` (line 222-224). Remove the `POINT_ANNOTATED` filter:

Change:

```typescript
  return events.filter(
    (e) => e.type !== "UNDO" && e.type !== "REDO" && e.type !== "POINT_ANNOTATED" && !undoneIds.has(e.eventId)
  );
```

to:

```typescript
  return events.filter(
    (e) => e.type !== "UNDO" && e.type !== "REDO" && !undoneIds.has(e.eventId)
  );
```

**Step 4: Update computeMatchStats**

Replace `computeMatchStats` (lines 277-307) with:

```typescript
export function computeMatchStats(events: MatchEvent[]): MatchStats {
  const effective = getEffectiveEvents(events);

  const stats: MatchStats = { A: emptyTeamStats(), B: emptyTeamStats() };

  for (const event of effective) {
    if (event.type === "POINT_WON") {
      const team = event.payload.team;
      stats[team].totalPointsWon += 1;

      const reason = event.payload.annotation;
      if (reason) {
        stats[team][reason] += 1;
      } else {
        stats[team].unannotated += 1;
      }
    }
  }

  return stats;
}
```

**Step 5: Remove unused PointAnnotatedEvent import**

In `src/domain/tennis.ts` line 1, remove `PointLossReason` from imports if no longer needed. Actually, `PointLossReason` is still used in `TeamStats` type, so keep it. But the `MatchEvent` union no longer includes `PointAnnotatedEvent` so no import changes needed — the type is accessed through `MatchEvent`.

**Step 6: Run tests to verify they pass**

Run: `bun run test 2>&1`
Expected: All tests PASS.

**Step 7: Commit**

```bash
git add src/domain/tennis.ts src/domain/tennis.test.ts
git commit -m "refactor: read annotations from POINT_WON events, remove POINT_ANNOTATED logic"
```

---

### Task 3: Update Scoring page with two-column annotation layout

**Files:**
- Modify: `src/ui/pages/Scoring.tsx`
- Modify: `src/ui/components/AnnotationBar.tsx`

**Step 1: Update AnnotationBar to per-player column component**

Replace entire `src/ui/components/AnnotationBar.tsx` with:

```typescript
import type { PointLossReason, TeamSide } from "../../domain/types.ts";

const WINNER_REASONS: { value: PointLossReason; label: string }[] = [
  { value: "ACE", label: "Ace" },
  { value: "WINNER", label: "Winner" },
];

const ERROR_REASONS: { value: PointLossReason; label: string }[] = [
  { value: "DOUBLE_FAULT", label: "Double Fault" },
  { value: "FOREHAND_ERROR", label: "FH Error" },
  { value: "BACKHAND_ERROR", label: "BH Error" },
  { value: "VOLLEY_ERROR", label: "Volley" },
  { value: "OUT_OF_BOUNDS", label: "Out" },
  { value: "NET_ERROR", label: "Net" },
];

type Props = {
  side: TeamSide;
  disabled: boolean;
  onSelect: (reason: PointLossReason) => void;
};

export default function AnnotationBar({ side, disabled, onSelect }: Props) {
  const chipBase =
    "w-full py-1.5 text-xs font-medium rounded-md transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  const winnerStyle =
    side === "A"
      ? "bg-blue-800/60 hover:bg-blue-700/60 active:bg-blue-600/60 text-blue-200"
      : "bg-red-800/60 hover:bg-red-700/60 active:bg-red-600/60 text-red-200";
  const errorStyle =
    "bg-gray-700/60 hover:bg-gray-600/60 active:bg-gray-500/60 text-gray-300";

  return (
    <div className="flex flex-col gap-1 px-1.5 pb-2">
      {WINNER_REASONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          disabled={disabled}
          className={`${chipBase} ${winnerStyle}`}
        >
          {label}
        </button>
      ))}
      <div className="h-px bg-gray-700/30 my-0.5" />
      {ERROR_REASONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          disabled={disabled}
          className={`${chipBase} ${errorStyle}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Update Scoring.tsx**

Replace entire `src/ui/pages/Scoring.tsx` with:

```typescript
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import type { MatchState, PointWonEvent, UndoEvent, MatchEvent, TeamSide, PointLossReason } from "../../domain/types.ts";
import { applyPointWon, replay, getEffectiveEvents } from "../../domain/tennis.ts";
import { getMatchEvents, appendEvent, getNextSeq } from "../../storage/eventRepo.ts";
import { updateMatchStatus } from "../../storage/matchRepo.ts";
import Scoreboard from "../components/Scoreboard.tsx";
import ScoreButton from "../components/ScoreButton.tsx";
import AnnotationBar from "../components/AnnotationBar.tsx";

const WINNER_ANNOTATIONS: Set<PointLossReason> = new Set(["ACE", "WINNER"]);

export default function Scoring() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [allEvents, setAllEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const canUndo = useMemo(
    () => getEffectiveEvents(allEvents).some((e) => e.type === "POINT_WON"),
    [allEvents],
  );

  // Load match state from events on mount
  useEffect(() => {
    if (!id) return;
    async function load() {
      const events = await getMatchEvents(id!);
      setAllEvents(events);
      if (events.length > 0) {
        const effective = getEffectiveEvents(events);
        const state = replay(effective);
        setMatchState(state);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleScore(team: TeamSide, annotation?: PointLossReason) {
    if (!matchState || matchState.status === "finished" || !id) return;

    const seq = await getNextSeq(id);
    const event: PointWonEvent = {
      eventId: crypto.randomUUID(),
      matchId: id,
      createdAt: new Date().toISOString(),
      seq,
      type: "POINT_WON",
      payload: annotation ? { team, annotation } : { team },
    };

    // Persist first
    await appendEvent(event);

    // Then update state
    const newState = applyPointWon(matchState, team);
    setMatchState(newState);
    setAllEvents((prev) => [...prev, event]);

    // If match just ended, update match record
    if (newState.status === "finished") {
      await updateMatchStatus(id, "finished");
    }
  }

  function handleAnnotatedScore(side: TeamSide, reason: PointLossReason) {
    // Winner annotations (Ace, Winner) → point to the player who performed it
    // Error annotations → point to opponent
    const scoringTeam = WINNER_ANNOTATIONS.has(reason)
      ? side
      : side === "A" ? "B" : "A";
    handleScore(scoringTeam, reason);
  }

  async function handleUndo() {
    if (!matchState || !id) return;

    // Find last active POINT_WON event
    const effective = getEffectiveEvents(allEvents);
    const lastPoint = [...effective].reverse().find((e) => e.type === "POINT_WON");
    if (!lastPoint) return;

    const seq = await getNextSeq(id);
    const undoEvent: UndoEvent = {
      eventId: crypto.randomUUID(),
      matchId: id,
      createdAt: new Date().toISOString(),
      seq,
      type: "UNDO",
      payload: { targetEventId: lastPoint.eventId },
    };

    // Persist first
    await appendEvent(undoEvent);

    // Full replay after undo
    const newAllEvents = [...allEvents, undoEvent];
    setAllEvents(newAllEvents);
    const newEffective = getEffectiveEvents(newAllEvents);
    const newState = replay(newEffective);
    setMatchState(newState);

    // If match was finished but undo reverts it
    if (newState.status === "in_progress" && matchState.status === "finished") {
      await updateMatchStatus(id, "in_progress");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (!matchState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Match not found</p>
      </div>
    );
  }

  const currentSet = matchState.sets[matchState.currentSetIndex];
  const isFinished = matchState.status === "finished";
  const teamAName = matchState.teams.A.players.map((p) => p.displayName).join(" / ");
  const teamBName = matchState.teams.B.players.map((p) => p.displayName).join(" / ");

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Scoreboard header */}
      <Scoreboard state={matchState} />

      {/* Match finished overlay */}
      {isFinished && (
        <div className="flex items-center justify-center py-6 px-4">
          <div className="bg-green-900/60 border border-green-700/40 rounded-xl px-6 py-4 text-center">
            <p className="text-2xl font-bold text-green-200">
              {matchState.winner === "A" ? teamAName : teamBName} wins!
            </p>
            <Link
              to="/new"
              className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              New Match
            </Link>
          </div>
        </div>
      )}

      {/* Two-column scoring layout */}
      <div className="flex flex-1">
        {/* Player A column */}
        <div className="flex-1 flex flex-col">
          <ScoreButton
            teamName={teamAName}
            side="A"
            game={currentSet.game}
            disabled={isFinished}
            onScore={() => handleScore("A")}
          />
          <AnnotationBar
            side="A"
            disabled={isFinished}
            onSelect={(reason) => handleAnnotatedScore("A", reason)}
          />
        </div>

        {/* Player B column */}
        <div className="flex-1 flex flex-col">
          <ScoreButton
            teamName={teamBName}
            side="B"
            game={currentSet.game}
            disabled={isFinished}
            onScore={() => handleScore("B")}
          />
          <AnnotationBar
            side="B"
            disabled={isFinished}
            onSelect={(reason) => handleAnnotatedScore("B", reason)}
          />
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="flex gap-px bg-gray-950">
        <button
          onClick={async () => {
            if (window.confirm("Cancel this match and start a new one?")) {
              if (id) await updateMatchStatus(id, "cancelled");
              navigate("/new");
            }
          }}
          className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3.5 text-sm font-semibold text-red-400 transition-colors duration-150"
        >
          Restart
        </button>
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed py-3.5 text-sm font-semibold text-gray-300 transition-colors duration-150"
        >
          ↩ Undo
        </button>
      </div>
    </div>
  );
}
```

**Step 3: Verify it compiles**

Run: `bun run build 2>&1`
Expected: Build succeeds with no errors.

**Step 4: Run tests**

Run: `bun run test 2>&1`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/ui/pages/Scoring.tsx src/ui/components/AnnotationBar.tsx
git commit -m "feat: two-column annotation-based scoring layout"
```

---

### Task 4: Clean up unused imports and references

**Files:**
- Modify: `src/domain/tennis.test.ts:1-3` (remove PointAnnotatedEvent import)
- Modify: `src/ui/pages/MatchHistory.tsx:1-7` (remove unused import if any)

**Step 1: Remove PointAnnotatedEvent from test imports**

In `src/domain/tennis.test.ts` line 3, change:

```typescript
import type { Ruleset, Team, MatchState, TeamSide, PointWonEvent, MatchCreatedEvent, UndoEvent, MatchEvent, PointAnnotatedEvent } from "./types.ts";
```

to:

```typescript
import type { Ruleset, Team, MatchState, TeamSide, PointWonEvent, MatchCreatedEvent, UndoEvent, MatchEvent, PointLossReason } from "./types.ts";
```

**Step 2: Verify build and tests**

Run: `bun run build 2>&1 && bun run test 2>&1`
Expected: Build succeeds, all tests pass.

**Step 3: Commit**

```bash
git add src/domain/tennis.test.ts src/ui/pages/MatchHistory.tsx
git commit -m "chore: clean up unused PointAnnotatedEvent references"
```

---

### Task 5: Manual verification

**Step 1: Start dev server**

Run: `bun run dev`

**Step 2: Manual test checklist**

1. Create a new match
2. Tap "Ace" on Player A → point goes to Player A, score updates
3. Tap "FH Error" on Player A → point goes to Player B, score updates
4. Tap "Winner" on Player B → point goes to Player B
5. Tap "Double Fault" on Player B → point goes to Player A
6. Tap the plain score button for Player A → point goes to Player A (unannotated)
7. Tap Undo → last point is reverted
8. Play until match finishes → winner overlay shows, all buttons disabled
9. Check match history → stats show correct annotation counts
