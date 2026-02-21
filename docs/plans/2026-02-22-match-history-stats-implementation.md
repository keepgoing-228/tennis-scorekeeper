# Match History & Point Annotation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add point-loss reason annotations to scoring and a match history page with per-match stats.

**Architecture:** New `POINT_ANNOTATED` event type in the existing event-sourced stream. Annotations are optional metadata that don't affect match state replay. Stats computed by correlating annotations with effective `POINT_WON` events. New `/history` route with list view and expandable match detail.

**Tech Stack:** React 19, TypeScript, Vitest, Dexie (IndexedDB), Tailwind CSS, React Router

---

### Task 1: Add PointLossReason enum and PointAnnotatedEvent type

**Files:**
- Modify: `src/domain/types.ts`

**Step 1: Add `PointLossReason` type and `PointAnnotatedEvent` to types.ts**

Add after the `MatchEndedEvent` type definition:

```typescript
// --- Point Annotation ---

export type PointLossReason =
  | "DOUBLE_FAULT"
  | "ACE"
  | "FOREHAND_ERROR"
  | "BACKHAND_ERROR"
  | "VOLLEY_ERROR"
  | "OUT_OF_BOUNDS"
  | "NET_ERROR"
  | "WINNER";

export type PointAnnotatedEvent = BaseEvent & {
  type: "POINT_ANNOTATED";
  payload: {
    pointEventId: string;
    reason: PointLossReason;
  };
};
```

**Step 2: Add `PointAnnotatedEvent` to the `MatchEvent` union**

Change the `MatchEvent` type to:

```typescript
export type MatchEvent =
  | MatchCreatedEvent
  | PointWonEvent
  | UndoEvent
  | RedoEvent
  | MatchEndedEvent
  | PointAnnotatedEvent;
```

**Step 3: Verify existing tests still pass**

Run: `cd /home/tim/Github/tennis-scorekeeper && bunx vitest run`
Expected: All existing tests pass (type addition is backward-compatible).

**Step 4: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat: add PointLossReason and PointAnnotatedEvent types"
```

---

### Task 2: Filter POINT_ANNOTATED from replay and add computeMatchStats

**Files:**
- Modify: `src/domain/tennis.ts`
- Modify: `src/domain/tennis.test.ts`

**Step 1: Write failing test for POINT_ANNOTATED being skipped in replay**

Add to `tennis.test.ts`:

```typescript
import type { PointAnnotatedEvent } from "./types.ts";

function makePointAnnotatedEvent(matchId: string, seq: number, pointEventId: string, reason: "DOUBLE_FAULT" | "ACE" | "FOREHAND_ERROR" | "BACKHAND_ERROR" | "VOLLEY_ERROR" | "OUT_OF_BOUNDS" | "NET_ERROR" | "WINNER"): PointAnnotatedEvent {
  return {
    eventId: `evt-${seq}`,
    matchId,
    createdAt: new Date().toISOString(),
    seq,
    type: "POINT_ANNOTATED",
    payload: { pointEventId, reason },
  };
}

describe("POINT_ANNOTATED in replay", () => {
  it("ignores POINT_ANNOTATED events during replay", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A"),
      makePointAnnotatedEvent("m1", 2, "evt-1", "ACE"),
      makePointWonEvent("m1", 3, "B"),
    ];
    const state = replay(events);
    expect(state.sets[0].game).toMatchObject({ pointsA: 15, pointsB: 15 });
  });

  it("excludes POINT_ANNOTATED from effective events", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A"),
      makePointAnnotatedEvent("m1", 2, "evt-1", "DOUBLE_FAULT"),
    ];
    const effective = getEffectiveEvents(events);
    expect(effective).toHaveLength(2);
    expect(effective.every(e => e.type !== "POINT_ANNOTATED")).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/tim/Github/tennis-scorekeeper && bunx vitest run`
Expected: FAIL — `POINT_ANNOTATED` events are not yet filtered.

**Step 3: Update getEffectiveEvents to filter POINT_ANNOTATED**

In `src/domain/tennis.ts`, update the `getEffectiveEvents` function's return filter:

```typescript
return events.filter(
  (e) => e.type !== "UNDO" && e.type !== "REDO" && e.type !== "POINT_ANNOTATED" && !undoneIds.has(e.eventId)
);
```

**Step 4: Run test to verify it passes**

Run: `cd /home/tim/Github/tennis-scorekeeper && bunx vitest run`
Expected: All tests pass.

**Step 5: Write failing test for computeMatchStats**

Add to `tennis.test.ts`:

```typescript
import { computeMatchStats } from "./tennis.ts";

describe("computeMatchStats", () => {
  it("computes stats from annotated points", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", defaultRuleset, { A: teamA, B: teamB }, "A"),
      makePointWonEvent("m1", 1, "A"),
      makePointAnnotatedEvent("m1", 2, "evt-1", "ACE"),
      makePointWonEvent("m1", 3, "B"),
      makePointAnnotatedEvent("m1", 4, "evt-3", "FOREHAND_ERROR"),
      makePointWonEvent("m1", 5, "A"),
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
      makePointWonEvent("m1", 1, "A"),
      makePointAnnotatedEvent("m1", 2, "evt-1", "ACE"),
      makeUndoEvent("m1", 3, "evt-1"),
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

**Step 6: Run test to verify it fails**

Run: `cd /home/tim/Github/tennis-scorekeeper && bunx vitest run`
Expected: FAIL — `computeMatchStats` not defined.

**Step 7: Implement computeMatchStats**

Add to `src/domain/tennis.ts`:

```typescript
import type { GameState, MatchState, NormalGameState, PointScore, Ruleset, Team, TeamSide, MatchEvent, PointLossReason } from "./types.ts";

export type TeamStats = {
  totalPointsWon: number;
  unannotated: number;
} & Record<PointLossReason, number>;

export type MatchStats = {
  A: TeamStats;
  B: TeamStats;
};

function emptyTeamStats(): TeamStats {
  return {
    totalPointsWon: 0,
    unannotated: 0,
    DOUBLE_FAULT: 0,
    ACE: 0,
    FOREHAND_ERROR: 0,
    BACKHAND_ERROR: 0,
    VOLLEY_ERROR: 0,
    OUT_OF_BOUNDS: 0,
    NET_ERROR: 0,
    WINNER: 0,
  };
}

export function computeMatchStats(events: MatchEvent[]): MatchStats {
  const effective = getEffectiveEvents(events);
  const effectiveIds = new Set(effective.map(e => e.eventId));

  const stats: MatchStats = { A: emptyTeamStats(), B: emptyTeamStats() };

  // Build annotation map: pointEventId -> reason
  const annotations = new Map<string, PointLossReason>();
  for (const event of events) {
    if (event.type === "POINT_ANNOTATED" && effectiveIds.has(event.payload.pointEventId)) {
      annotations.set(event.payload.pointEventId, event.payload.reason);
    }
  }

  // Count points and apply annotations
  for (const event of effective) {
    if (event.type === "POINT_WON") {
      const team = event.payload.team;
      stats[team].totalPointsWon += 1;

      const reason = annotations.get(event.eventId);
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

**Step 8: Run tests to verify they pass**

Run: `cd /home/tim/Github/tennis-scorekeeper && bunx vitest run`
Expected: All tests pass.

**Step 9: Commit**

```bash
git add src/domain/tennis.ts src/domain/tennis.test.ts
git commit -m "feat: filter POINT_ANNOTATED from replay, add computeMatchStats"
```

---

### Task 3: Add annotation bar to Scoring page

**Files:**
- Create: `src/ui/components/AnnotationBar.tsx`
- Modify: `src/ui/pages/Scoring.tsx`

**Step 1: Create AnnotationBar component**

Create `src/ui/components/AnnotationBar.tsx`:

```tsx
import type { PointLossReason } from "../../domain/types.ts";

const REASONS: { value: PointLossReason; label: string }[] = [
  { value: "DOUBLE_FAULT", label: "Double Fault" },
  { value: "ACE", label: "Ace" },
  { value: "FOREHAND_ERROR", label: "FH Error" },
  { value: "BACKHAND_ERROR", label: "BH Error" },
  { value: "VOLLEY_ERROR", label: "Volley" },
  { value: "OUT_OF_BOUNDS", label: "Out" },
  { value: "NET_ERROR", label: "Net" },
  { value: "WINNER", label: "Winner" },
];

type Props = {
  onSelect: (reason: PointLossReason) => void;
};

export default function AnnotationBar({ onSelect }: Props) {
  return (
    <div className="bg-gray-800 px-2 py-2 flex flex-wrap justify-center gap-1.5">
      {REASONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-600 hover:bg-gray-500 active:bg-gray-400 text-white transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Integrate AnnotationBar into Scoring.tsx**

In `src/ui/pages/Scoring.tsx`:

Add import at top:
```typescript
import type { MatchState, PointWonEvent, UndoEvent, MatchEvent, TeamSide, PointAnnotatedEvent, PointLossReason } from "../../domain/types.ts";
import AnnotationBar from "../components/AnnotationBar.tsx";
```

Add state to track the last scored point's event ID. Add after the `canUndo` useMemo:

```typescript
const lastPointEventId = useMemo(() => {
  const effective = getEffectiveEvents(allEvents);
  const lastPoint = [...effective].reverse().find((e) => e.type === "POINT_WON");
  return lastPoint?.eventId ?? null;
}, [allEvents]);

const isLastPointAnnotated = useMemo(() => {
  if (!lastPointEventId) return true;
  return allEvents.some(
    (e) => e.type === "POINT_ANNOTATED" && e.payload.pointEventId === lastPointEventId
  );
}, [allEvents, lastPointEventId]);
```

Add annotation handler after `handleUndo`:

```typescript
async function handleAnnotate(reason: PointLossReason) {
  if (!id || !lastPointEventId || isLastPointAnnotated) return;

  const seq = await getNextSeq(id);
  const event: PointAnnotatedEvent = {
    eventId: crypto.randomUUID(),
    matchId: id,
    createdAt: new Date().toISOString(),
    seq,
    type: "POINT_ANNOTATED",
    payload: { pointEventId: lastPointEventId, reason },
  };

  await appendEvent(event);
  setAllEvents((prev) => [...prev, event]);
}
```

Add the AnnotationBar in the JSX, between the score buttons div and the bottom action buttons:

```tsx
{/* Annotation bar */}
{lastPointEventId && !isLastPointAnnotated && !isFinished && (
  <AnnotationBar onSelect={handleAnnotate} />
)}

{/* Bottom action buttons */}
```

**Step 3: Verify the app works manually**

Run: `cd /home/tim/Github/tennis-scorekeeper && bunx vite --open`
- Create a match, score a point, verify annotation chips appear
- Tap a reason, verify the bar dismisses
- Score another point without annotating, verify bar updates
- Undo, verify bar updates

**Step 4: Commit**

```bash
git add src/ui/components/AnnotationBar.tsx src/ui/pages/Scoring.tsx
git commit -m "feat: add annotation bar for point-loss reasons on scoring page"
```

---

### Task 4: Add match history list page

**Files:**
- Create: `src/ui/pages/MatchHistory.tsx`
- Modify: `src/App.tsx`
- Modify: `src/ui/pages/NewMatch.tsx`
- Modify: `src/storage/matchRepo.ts`

**Step 1: Add getCompletedMatches to matchRepo**

Add to `src/storage/matchRepo.ts`:

```typescript
export async function getCompletedMatches(): Promise<MatchRecord[]> {
  return db.matches.where("status").equals("finished").reverse().sortBy("createdAt");
}
```

**Step 2: Create MatchHistory page**

Create `src/ui/pages/MatchHistory.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { MatchRecord } from "../../storage/db.ts";
import type { MatchEvent } from "../../domain/types.ts";
import type { MatchStats } from "../../domain/tennis.ts";
import { getCompletedMatches } from "../../storage/matchRepo.ts";
import { getMatchEvents } from "../../storage/eventRepo.ts";
import { computeMatchStats, getEffectiveEvents, replay } from "../../domain/tennis.ts";

type MatchSummary = {
  record: MatchRecord;
  setScores: string;
  winnerName: string;
  matchTypeLabel: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMatchTypeLabel(record: MatchRecord): string {
  if (record.ruleset.bestOf === "practice") return "Practice Tiebreak";
  return `Best of ${record.ruleset.bestOf}`;
}

export default function MatchHistory() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, MatchStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const records = await getCompletedMatches();
      const summaries: MatchSummary[] = [];

      for (const record of records) {
        const events = await getMatchEvents(record.matchId);
        const effective = getEffectiveEvents(events);
        const state = replay(effective);

        const setScores = state.sets
          .map((s) => `${s.gamesA}-${s.gamesB}`)
          .join(", ");

        const winnerTeam = state.winner;
        const winnerName = winnerTeam
          ? record.teams[winnerTeam].players.map((p) => p.displayName).join(" / ")
          : "Unknown";

        summaries.push({
          record,
          setScores,
          winnerName,
          matchTypeLabel: getMatchTypeLabel(record),
        });
      }

      setMatches(summaries);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleExpand(matchId: string) {
    if (expandedId === matchId) {
      setExpandedId(null);
      return;
    }

    if (!stats[matchId]) {
      const events = await getMatchEvents(matchId);
      const matchStats = computeMatchStats(events);
      setStats((prev) => ({ ...prev, [matchId]: matchStats }));
    }

    setExpandedId(matchId);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Match History</h1>
          <Link to="/new" className="text-blue-400 hover:text-blue-300 text-sm">
            New Match
          </Link>
        </div>

        {matches.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No completed matches yet.</p>
        ) : (
          <div className="space-y-2">
            {matches.map(({ record, setScores, winnerName, matchTypeLabel }) => (
              <div key={record.matchId}>
                <button
                  onClick={() => toggleExpand(record.matchId)}
                  className="w-full bg-gray-800 rounded-lg p-3 text-left hover:bg-gray-750 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">
                        {record.teams.A.players.map((p) => p.displayName).join(" / ")}
                        {" vs "}
                        {record.teams.B.players.map((p) => p.displayName).join(" / ")}
                      </div>
                      <div className="text-lg font-mono mt-1">{setScores}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-green-400">{winnerName} wins</div>
                      <div className="text-gray-400">{matchTypeLabel}</div>
                      <div className="text-gray-500">{formatDate(record.createdAt)}</div>
                    </div>
                  </div>
                </button>

                {expandedId === record.matchId && stats[record.matchId] && (
                  <StatsDetail
                    stats={stats[record.matchId]}
                    teamAName={record.teams.A.players.map((p) => p.displayName).join(" / ")}
                    teamBName={record.teams.B.players.map((p) => p.displayName).join(" / ")}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type StatsDetailProps = {
  stats: MatchStats;
  teamAName: string;
  teamBName: string;
};

const STAT_LABELS: { key: string; label: string }[] = [
  { key: "totalPointsWon", label: "Total Points Won" },
  { key: "ACE", label: "Aces" },
  { key: "DOUBLE_FAULT", label: "Double Faults" },
  { key: "FOREHAND_ERROR", label: "Forehand Errors" },
  { key: "BACKHAND_ERROR", label: "Backhand Errors" },
  { key: "VOLLEY_ERROR", label: "Volley Errors" },
  { key: "OUT_OF_BOUNDS", label: "Out of Bounds" },
  { key: "NET_ERROR", label: "Net Errors" },
  { key: "WINNER", label: "Winners" },
  { key: "unannotated", label: "Unannotated" },
];

function StatsDetail({ stats, teamAName, teamBName }: StatsDetailProps) {
  return (
    <div className="bg-gray-750 rounded-b-lg px-3 py-2 mt-px">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left py-1">&nbsp;</th>
            <th className="text-center py-1">{teamAName}</th>
            <th className="text-center py-1">{teamBName}</th>
          </tr>
        </thead>
        <tbody>
          {STAT_LABELS.map(({ key, label }) => (
            <tr key={key} className="border-b border-gray-800">
              <td className="py-1 text-gray-300">{label}</td>
              <td className="text-center font-mono">{stats.A[key as keyof typeof stats.A]}</td>
              <td className="text-center font-mono">{stats.B[key as keyof typeof stats.B]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 3: Add `/history` route to App.tsx**

In `src/App.tsx`, add import and route:

```tsx
import MatchHistory from "./ui/pages/MatchHistory.tsx";
```

Add route inside `<Routes>`:

```tsx
<Route path="/history" element={<MatchHistory />} />
```

**Step 4: Add "Match History" button to NewMatch.tsx**

In `src/ui/pages/NewMatch.tsx`, add a Link import:

```tsx
import { useNavigate, Link } from "react-router";
```

Add after the `<h1>New Match</h1>`:

```tsx
<Link
  to="/history"
  className="block text-center text-blue-400 hover:text-blue-300 text-sm"
>
  Match History
</Link>
```

**Step 5: Verify manually**

Run: `cd /home/tim/Github/tennis-scorekeeper && bunx vite --open`
- Navigate to `/history` — should show empty state or past matches
- Click "New Match" link to return to match creation
- Click "Match History" from match creation page

**Step 6: Commit**

```bash
git add src/ui/pages/MatchHistory.tsx src/App.tsx src/ui/pages/NewMatch.tsx src/storage/matchRepo.ts
git commit -m "feat: add match history page with expandable stats"
```

---

### Task 5: End-to-end verification

**Files:** None (testing only)

**Step 1: Run all tests**

Run: `cd /home/tim/Github/tennis-scorekeeper && bunx vitest run`
Expected: All tests pass.

**Step 2: Run TypeScript type check**

Run: `cd /home/tim/Github/tennis-scorekeeper && bunx tsc --noEmit`
Expected: No type errors.

**Step 3: Manual end-to-end test**

Run: `cd /home/tim/Github/tennis-scorekeeper && bunx vite --open`

Test flow:
1. Create a new match
2. Score several points, annotating some with reasons
3. Complete the match
4. Navigate to Match History
5. Verify the match appears with correct set scores and winner
6. Tap to expand and verify stats show correct annotation counts
7. Verify unannotated points are counted correctly

**Step 4: Commit any fixes if needed**
