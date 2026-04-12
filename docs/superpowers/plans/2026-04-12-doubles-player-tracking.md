# Doubles Per-Player Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional per-player attribution on annotated doubles points, with a stats drawer showing individual player statistics.

**Architecture:** Extend `PointWonEvent` payload with optional `playerId`. Add a `PlayerAttributionPopup` component shown after annotation taps in doubles. Add a `StatsDrawer` component with per-player stat breakdowns. Add `computePlayerStats()` to domain logic.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, i18next (en/zh/ja)

---

### Task 1: Extend PointWonEvent type with optional playerId

**Files:**
- Modify: `src/domain/types.ts:81-84`

- [ ] **Step 1: Add playerId to PointWonEvent payload type**

In `src/domain/types.ts`, change:

```typescript
export type PointWonEvent = BaseEvent & {
  type: "POINT_WON";
  payload: { team: TeamSide; annotation?: PointLossReason };
};
```

to:

```typescript
export type PointWonEvent = BaseEvent & {
  type: "POINT_WON";
  payload: { team: TeamSide; annotation?: PointLossReason; playerId?: string };
};
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: All tests PASS (adding an optional field is backwards compatible)

- [ ] **Step 3: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat: add optional playerId to PointWonEvent payload"
```

---

### Task 2: Add PlayerStats type and computePlayerStats function

**Files:**
- Modify: `src/domain/tennis.ts:266-311`
- Test: `src/domain/tennis.test.ts`

- [ ] **Step 1: Write failing tests for computePlayerStats**

Add these test helpers and test block at the end of `src/domain/tennis.test.ts`:

```typescript
import { computePlayerStats } from "./tennis.ts";
import type { PlayerStats } from "./tennis.ts";
```

Update the existing import line to also import `computePlayerStats` and add a `PlayerStats` import. Then add the test block:

```typescript
const doublesRuleset: Ruleset = {
  bestOf: 3,
  tiebreak: "7pt",
  matchType: "doubles",
};

const doublesTeamA: Team = {
  teamId: "A",
  players: [
    { playerId: "p1", displayName: "Alice" },
    { playerId: "p2", displayName: "Bob" },
  ],
};

const doublesTeamB: Team = {
  teamId: "B",
  players: [
    { playerId: "p3", displayName: "Carol" },
    { playerId: "p4", displayName: "Dave" },
  ],
};

function makePlayerPointEvent(
  matchId: string,
  seq: number,
  team: TeamSide,
  annotation: PointLossReason,
  playerId: string,
): PointWonEvent {
  return {
    eventId: `evt-${seq}`,
    matchId,
    createdAt: new Date().toISOString(),
    seq,
    type: "POINT_WON",
    payload: { team, annotation, playerId },
  };
}

describe("computePlayerStats", () => {
  it("returns empty record when no events have playerId", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", doublesRuleset, { A: doublesTeamA, B: doublesTeamB }, "A"),
      makePointWonEvent("m1", 1, "A", "ACE"),
      makePointWonEvent("m1", 2, "B"),
    ];
    const stats = computePlayerStats(events);
    expect(Object.keys(stats)).toHaveLength(0);
  });

  it("aggregates stats per player from attributed events", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", doublesRuleset, { A: doublesTeamA, B: doublesTeamB }, "A"),
      makePlayerPointEvent("m1", 1, "A", "ACE", "p1"),
      makePlayerPointEvent("m1", 2, "A", "ACE", "p1"),
      makePlayerPointEvent("m1", 3, "A", "FOREHAND_ERROR", "p2"),
      makePlayerPointEvent("m1", 4, "B", "WINNER", "p3"),
    ];
    const stats = computePlayerStats(events);

    expect(stats["p1"].aces).toBe(2);
    expect(stats["p1"].totalWinners).toBe(2);
    expect(stats["p1"].totalErrors).toBe(0);

    expect(stats["p2"].forehandErrors).toBe(1);
    expect(stats["p2"].totalErrors).toBe(1);
    expect(stats["p2"].totalWinners).toBe(0);

    expect(stats["p3"].winners).toBe(1);
    expect(stats["p3"].totalWinners).toBe(1);
  });

  it("computes winnerErrorRatio correctly", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", doublesRuleset, { A: doublesTeamA, B: doublesTeamB }, "A"),
      makePlayerPointEvent("m1", 1, "A", "ACE", "p1"),
      makePlayerPointEvent("m1", 2, "A", "ACE", "p1"),
      makePlayerPointEvent("m1", 3, "A", "FOREHAND_ERROR", "p1"),
    ];
    const stats = computePlayerStats(events);
    expect(stats["p1"].winnerErrorRatio).toBe(2);
  });

  it("returns 0 ratio when player has no winners and no errors", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", doublesRuleset, { A: doublesTeamA, B: doublesTeamB }, "A"),
    ];
    const stats = computePlayerStats(events);
    expect(Object.keys(stats)).toHaveLength(0);
  });

  it("returns Infinity ratio when player has winners but no errors", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", doublesRuleset, { A: doublesTeamA, B: doublesTeamB }, "A"),
      makePlayerPointEvent("m1", 1, "A", "ACE", "p1"),
    ];
    const stats = computePlayerStats(events);
    expect(stats["p1"].winnerErrorRatio).toBe(Infinity);
  });

  it("excludes undone events from player stats", () => {
    const events: MatchEvent[] = [
      makeMatchCreatedEvent("m1", doublesRuleset, { A: doublesTeamA, B: doublesTeamB }, "A"),
      makePlayerPointEvent("m1", 1, "A", "ACE", "p1"),
      makeUndoEvent("m1", 2, "evt-1"),
    ];
    const stats = computePlayerStats(events);
    expect(Object.keys(stats)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: FAIL — `computePlayerStats` is not exported from `./tennis.ts`

- [ ] **Step 3: Implement PlayerStats type and computePlayerStats**

Add at the end of `src/domain/tennis.ts`, after `computeMatchStats`:

```typescript
export type PlayerStats = {
  aces: number;
  doubleFaults: number;
  forehandWinners: number;
  backhandWinners: number;
  forehandErrors: number;
  backhandErrors: number;
  volleyErrors: number;
  outOfBounds: number;
  netErrors: number;
  winners: number;
  totalWinners: number;
  totalErrors: number;
  winnerErrorRatio: number;
};

function emptyPlayerStats(): PlayerStats {
  return {
    aces: 0,
    doubleFaults: 0,
    forehandWinners: 0,
    backhandWinners: 0,
    forehandErrors: 0,
    backhandErrors: 0,
    volleyErrors: 0,
    outOfBounds: 0,
    netErrors: 0,
    winners: 0,
    totalWinners: 0,
    totalErrors: 0,
    winnerErrorRatio: 0,
  };
}

const WINNER_ANNOTATIONS: Set<PointLossReason> = new Set(["ACE", "WINNER"]);
const ERROR_ANNOTATIONS: Set<PointLossReason> = new Set([
  "DOUBLE_FAULT",
  "FOREHAND_ERROR",
  "BACKHAND_ERROR",
  "VOLLEY_ERROR",
  "OUT_OF_BOUNDS",
  "NET_ERROR",
]);

const ANNOTATION_TO_STAT: Record<PointLossReason, keyof PlayerStats> = {
  ACE: "aces",
  DOUBLE_FAULT: "doubleFaults",
  FOREHAND_ERROR: "forehandErrors",
  BACKHAND_ERROR: "backhandErrors",
  VOLLEY_ERROR: "volleyErrors",
  OUT_OF_BOUNDS: "outOfBounds",
  NET_ERROR: "netErrors",
  WINNER: "winners",
};

export function computePlayerStats(events: MatchEvent[]): Record<string, PlayerStats> {
  const effective = getEffectiveEvents(events);
  const stats: Record<string, PlayerStats> = {};

  for (const event of effective) {
    if (event.type === "POINT_WON" && event.payload.playerId && event.payload.annotation) {
      const { playerId, annotation } = event.payload;

      if (!stats[playerId]) {
        stats[playerId] = emptyPlayerStats();
      }

      const statKey = ANNOTATION_TO_STAT[annotation];
      (stats[playerId][statKey] as number) += 1;

      if (WINNER_ANNOTATIONS.has(annotation)) {
        stats[playerId].totalWinners += 1;
      } else if (ERROR_ANNOTATIONS.has(annotation)) {
        stats[playerId].totalErrors += 1;
      }

      stats[playerId].winnerErrorRatio =
        stats[playerId].totalErrors === 0
          ? (stats[playerId].totalWinners > 0 ? Infinity : 0)
          : stats[playerId].totalWinners / stats[playerId].totalErrors;
    }
  }

  return stats;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/tennis.ts src/domain/tennis.test.ts
git commit -m "feat: add computePlayerStats for per-player annotation tracking"
```

---

### Task 3: Add i18n keys for player attribution and stats drawer

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/ja.json`

- [ ] **Step 1: Add new keys to en.json**

Add these keys to `src/i18n/locales/en.json` (before the closing `}`):

```json
  "whoHitIt": "Who hit it?",
  "whoMadeError": "Who made the error?",
  "skipAttribution": "Skip",
  "playerStats": "Player Statistics",
  "stats": "Stats",
  "totalWinners": "Winners",
  "totalErrors": "Errors",
  "winnerErrorRatio": "W/E Ratio",
  "fhWinners": "FH Win",
  "bhWinners": "BH Win",
  "fhErrors": "FH Err",
  "bhErrors": "BH Err"
```

- [ ] **Step 2: Add new keys to zh.json**

Add these keys to `src/i18n/locales/zh.json`:

```json
  "whoHitIt": "誰打的？",
  "whoMadeError": "誰失誤了？",
  "skipAttribution": "跳過",
  "playerStats": "球員統計",
  "stats": "統計",
  "totalWinners": "致勝",
  "totalErrors": "失誤",
  "winnerErrorRatio": "致勝/失誤",
  "fhWinners": "正手致勝",
  "bhWinners": "反手致勝",
  "fhErrors": "正手失誤",
  "bhErrors": "反手失誤"
```

- [ ] **Step 3: Add new keys to ja.json**

Add these keys to `src/i18n/locales/ja.json`:

```json
  "whoHitIt": "誰が打った？",
  "whoMadeError": "誰がミスした？",
  "skipAttribution": "スキップ",
  "playerStats": "選手統計",
  "stats": "統計",
  "totalWinners": "ウィナー",
  "totalErrors": "エラー",
  "winnerErrorRatio": "W/E比",
  "fhWinners": "FHウィナー",
  "bhWinners": "BHウィナー",
  "fhErrors": "FHエラー",
  "bhErrors": "BHエラー"
```

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/zh.json src/i18n/locales/ja.json
git commit -m "feat: add i18n keys for player attribution and stats drawer"
```

---

### Task 4: Create PlayerAttributionPopup component

**Files:**
- Create: `src/ui/components/PlayerAttributionPopup.tsx`

- [ ] **Step 1: Create the component**

Create `src/ui/components/PlayerAttributionPopup.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import type { Player, PointLossReason } from "../../domain/types.ts";

const WINNER_ANNOTATIONS: Set<PointLossReason> = new Set(["ACE", "WINNER"]);

type Props = {
  players: Player[];
  annotation: PointLossReason;
  onSelect: (playerId: string) => void;
  onSkip: () => void;
};

export default function PlayerAttributionPopup({
  players,
  annotation,
  onSelect,
  onSkip,
}: Props) {
  const { t } = useTranslation();
  const isWinner = WINNER_ANNOTATIONS.has(annotation);
  const prompt = isWinner ? t("whoHitIt") : t("whoMadeError");

  // Map annotation to its i18n label key
  const annotationLabels: Record<string, string> = {
    ACE: "ace",
    WINNER: "winner",
    DOUBLE_FAULT: "doubleFault",
    FOREHAND_ERROR: "fhError",
    BACKHAND_ERROR: "bhError",
    VOLLEY_ERROR: "volleyError",
    OUT_OF_BOUNDS: "outError",
    NET_ERROR: "netError",
  };
  const annotationLabel = t(annotationLabels[annotation] ?? annotation);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onSkip}
    >
      <div
        className="bg-gray-800 rounded-xl p-6 mx-4 max-w-sm w-full border border-gray-600"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`text-center text-sm font-bold mb-1 ${
            isWinner ? "text-green-400" : "text-red-400"
          }`}
        >
          {annotationLabel.toUpperCase()}
        </div>
        <div className="text-center text-gray-300 mb-5">{prompt}</div>

        <div className="flex gap-3">
          {players.map((player) => (
            <button
              key={player.playerId}
              onClick={() => onSelect(player.playerId)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg py-5 text-center transition-colors duration-150"
            >
              <div className="text-lg font-bold text-white">
                {player.displayName}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onSkip}
          className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-400 transition-colors duration-150"
        >
          {t("skipAttribution")}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the project builds**

Run: `bun run build`
Expected: Build succeeds with no type errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/PlayerAttributionPopup.tsx
git commit -m "feat: add PlayerAttributionPopup component for doubles"
```

---

### Task 5: Create StatsDrawer component

**Files:**
- Create: `src/ui/components/StatsDrawer.tsx`

- [ ] **Step 1: Create the component**

Create `src/ui/components/StatsDrawer.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import type { Player, Team } from "../../domain/types.ts";
import type { PlayerStats } from "../../domain/tennis.ts";

type Props = {
  teams: { A: Team; B: Team };
  playerStats: Record<string, PlayerStats>;
  onClose: () => void;
};

function PlayerCard({ player, stats }: { player: Player; stats: PlayerStats | undefined }) {
  const { t } = useTranslation();
  const s = stats ?? {
    aces: 0, doubleFaults: 0, forehandWinners: 0, backhandWinners: 0,
    forehandErrors: 0, backhandErrors: 0, volleyErrors: 0, outOfBounds: 0,
    netErrors: 0, winners: 0, totalWinners: 0, totalErrors: 0, winnerErrorRatio: 0,
  };

  const ratioDisplay =
    s.winnerErrorRatio === Infinity
      ? "∞"
      : s.winnerErrorRatio.toFixed(2);

  const ratioColor =
    s.totalWinners === 0 && s.totalErrors === 0
      ? "text-gray-400"
      : s.winnerErrorRatio >= 1
        ? "text-green-400"
        : "text-red-400";

  return (
    <div className="bg-gray-700/60 rounded-lg p-3 mb-2">
      <div className="font-bold text-sm mb-2">{player.displayName}</div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div className="text-green-400 font-bold text-lg">{s.aces}</div>
          <div className="text-gray-400">{t("statAces")}</div>
        </div>
        <div>
          <div className="text-green-400 font-bold text-lg">{s.totalWinners}</div>
          <div className="text-gray-400">{t("totalWinners")}</div>
        </div>
        <div>
          <div className="text-red-400 font-bold text-lg">{s.totalErrors}</div>
          <div className="text-gray-400">{t("totalErrors")}</div>
        </div>
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-gray-600/40 text-xs text-gray-400">
        <span>{t("fhWinners")}: {s.forehandWinners} | {t("bhWinners")}: {s.backhandWinners}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{t("fhErrors")}: {s.forehandErrors} | {t("bhErrors")}: {s.backhandErrors}</span>
      </div>
      <div className="mt-1 text-xs text-gray-300">
        {t("winnerErrorRatio")}: <span className={`font-bold ${ratioColor}`}>{ratioDisplay}</span>
      </div>
    </div>
  );
}

export default function StatsDrawer({ teams, playerStats, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-t-2xl max-h-[80vh] overflow-y-auto border-t-2 border-green-500/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        <div className="text-center font-bold text-base mb-4">{t("playerStats")}</div>

        <div className="px-4 pb-6">
          {/* Team A */}
          <div className="mb-4">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
              {teams.A.players.map((p) => p.displayName).join(" / ")}
            </div>
            {teams.A.players.map((player) => (
              <PlayerCard
                key={player.playerId}
                player={player}
                stats={playerStats[player.playerId]}
              />
            ))}
          </div>

          {/* Team B */}
          <div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
              {teams.B.players.map((p) => p.displayName).join(" / ")}
            </div>
            {teams.B.players.map((player) => (
              <PlayerCard
                key={player.playerId}
                player={player}
                stats={playerStats[player.playerId]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the project builds**

Run: `bun run build`
Expected: Build succeeds with no type errors

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/StatsDrawer.tsx
git commit -m "feat: add StatsDrawer component for per-player stats"
```

---

### Task 6: Integrate PlayerAttributionPopup into Scoring page

**Files:**
- Modify: `src/ui/pages/Scoring.tsx`

This task adds the player attribution popup to the annotation flow. When a doubles match annotation is tapped, instead of immediately scoring, we show the popup and score with the selected playerId.

- [ ] **Step 1: Add state and imports**

At the top of `src/ui/pages/Scoring.tsx`, add the import:

```typescript
import PlayerAttributionPopup from "../components/PlayerAttributionPopup.tsx";
```

Inside the `Scoring` component, after the existing `useState` declarations, add:

```typescript
const [pendingAnnotation, setPendingAnnotation] = useState<{
  side: TeamSide;
  scoringTeam: TeamSide;
  annotation: PointLossReason;
} | null>(null);
```

- [ ] **Step 2: Modify handleScore to accept optional playerId**

Change the `handleScore` function signature and event construction:

```typescript
async function handleScore(team: TeamSide, annotation?: PointLossReason, playerId?: string) {
  if (!matchState || matchState.status === "finished" || !id) return;

  const seq = await getNextSeq(id);
  const payload: PointWonEvent["payload"] = { team };
  if (annotation) payload.annotation = annotation;
  if (playerId) payload.playerId = playerId;

  const event: PointWonEvent = {
    eventId: uuid(),
    matchId: id,
    createdAt: new Date().toISOString(),
    seq,
    type: "POINT_WON",
    payload,
  };

  await appendEvent(event);

  const newState = applyPointWon(matchState, team);
  setMatchState(newState);
  setAllEvents((prev) => [...prev, event]);

  if (newState.status === "finished") {
    await updateMatchStatus(id, "finished");
  }
}
```

- [ ] **Step 3: Modify handleAnnotatedScore to show popup in doubles**

Replace the `handleAnnotatedScore` function:

```typescript
function handleAnnotatedScore(side: TeamSide, reason: PointLossReason) {
  const scoringTeam = WINNER_ANNOTATIONS.has(reason)
    ? side
    : side === "A" ? "B" : "A";

  const isDoubles = matchState?.ruleset.matchType === "doubles";
  if (isDoubles) {
    setPendingAnnotation({ side, scoringTeam, annotation: reason });
  } else {
    handleScore(scoringTeam, reason);
  }
}
```

- [ ] **Step 4: Add popup handlers**

After `handleAnnotatedScore`, add:

```typescript
function handlePlayerSelected(playerId: string) {
  if (!pendingAnnotation) return;
  handleScore(pendingAnnotation.scoringTeam, pendingAnnotation.annotation, playerId);
  setPendingAnnotation(null);
}

function handleSkipAttribution() {
  if (!pendingAnnotation) return;
  handleScore(pendingAnnotation.scoringTeam, pendingAnnotation.annotation);
  setPendingAnnotation(null);
}
```

- [ ] **Step 5: Render the popup**

Add the popup rendering just before the closing `</div>` of the root element (before `{/* Bottom action buttons */}`). Actually, place it right after the `isFinished` overlay block and before the two-column scoring layout:

```tsx
{pendingAnnotation && matchState && (
  <PlayerAttributionPopup
    players={matchState.teams[pendingAnnotation.side].players}
    annotation={pendingAnnotation.annotation}
    onSelect={handlePlayerSelected}
    onSkip={handleSkipAttribution}
  />
)}
```

- [ ] **Step 6: Verify the project builds**

Run: `bun run build`
Expected: Build succeeds with no type errors

- [ ] **Step 7: Manual test in browser**

Run: `bun run dev`

1. Create a new doubles match with 4 players
2. Tap a team side → point scores immediately (no popup) ✓
3. Tap an annotation (e.g., Ace) → popup appears with the two players on that team ✓
4. Tap a player name → point scores and popup closes ✓
5. Tap an annotation → tap "Skip" → point scores without player attribution ✓
6. Tap outside the popup → point scores without player attribution ✓
7. Create a singles match → annotations score immediately without popup ✓

- [ ] **Step 8: Commit**

```bash
git add src/ui/pages/Scoring.tsx
git commit -m "feat: integrate player attribution popup into doubles scoring"
```

---

### Task 7: Integrate StatsDrawer into Scoring page

**Files:**
- Modify: `src/ui/pages/Scoring.tsx`

- [ ] **Step 1: Add imports and state**

Add imports at the top of `src/ui/pages/Scoring.tsx`:

```typescript
import StatsDrawer from "../components/StatsDrawer.tsx";
import { computePlayerStats } from "../../domain/tennis.ts";
```

Inside the component, add state for drawer visibility:

```typescript
const [showStats, setShowStats] = useState(false);
```

- [ ] **Step 2: Compute player stats from events**

Add a `useMemo` for player stats (after the existing `canUndo` memo):

```typescript
const playerStats = useMemo(
  () => computePlayerStats(allEvents),
  [allEvents],
);
```

- [ ] **Step 3: Add Stats button to bottom action bar**

In the bottom action buttons section, add a Stats button. The current buttons are Restart, Swap, and Undo. Add a Stats button that only shows for doubles. Change the bottom bar from:

```tsx
<div className="flex gap-px bg-gray-950">
  <button
    onClick={async () => { ... }}
    className="flex-1 ..."
  >
    {t('restart')}
  </button>
  <button
    onClick={() => setSwapped((s) => !s)}
    className="flex-1 ..."
  >
    {t('swap')}
  </button>
  <button
    onClick={handleUndo}
    disabled={!canUndo}
    className="flex-1 ..."
  >
    {t('undo')}
  </button>
</div>
```

to include the stats button between Swap and Undo (only for doubles):

```tsx
<div className="flex gap-px bg-gray-950">
  <button
    onClick={async () => {
      if (window.confirm(t('confirmCancel'))) {
        if (id) await updateMatchStatus(id, "cancelled");
        navigate("/new");
      }
    }}
    className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3.5 text-sm font-semibold text-red-400 transition-colors duration-150"
  >
    {t('restart')}
  </button>
  <button
    onClick={() => setSwapped((s) => !s)}
    className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3.5 text-sm font-semibold text-gray-300 transition-colors duration-150"
  >
    {t('swap')}
  </button>
  {matchState.ruleset.matchType === "doubles" && (
    <button
      onClick={() => setShowStats(true)}
      className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 py-3.5 text-sm font-semibold text-green-400 transition-colors duration-150"
    >
      {t('stats')}
    </button>
  )}
  <button
    onClick={handleUndo}
    disabled={!canUndo}
    className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed py-3.5 text-sm font-semibold text-gray-300 transition-colors duration-150"
  >
    {t('undo')}
  </button>
</div>
```

- [ ] **Step 4: Render StatsDrawer**

Add the drawer rendering at the end of the component's JSX, just before the root closing `</div>`:

```tsx
{showStats && matchState.ruleset.matchType === "doubles" && (
  <StatsDrawer
    teams={matchState.teams}
    playerStats={playerStats}
    onClose={() => setShowStats(false)}
  />
)}
```

- [ ] **Step 5: Verify the project builds**

Run: `bun run build`
Expected: Build succeeds with no type errors

- [ ] **Step 6: Manual test in browser**

Run: `bun run dev`

1. Create a doubles match → Stats button visible in bottom bar ✓
2. Create a singles match → Stats button NOT visible ✓
3. In doubles match, tap Stats → drawer slides up showing all 4 players with zero stats ✓
4. Tap outside drawer → drawer closes ✓
5. Score some annotated points with player attribution → open Stats → see per-player numbers update ✓
6. Verify W/E ratio displays correctly (including "∞" when no errors) ✓

- [ ] **Step 7: Commit**

```bash
git add src/ui/pages/Scoring.tsx
git commit -m "feat: integrate stats drawer into doubles scoring page"
```

---

### Task 8: Run full test suite and final verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `bun run test`
Expected: All tests PASS

- [ ] **Step 2: Run linter**

Run: `bun run lint`
Expected: No errors

- [ ] **Step 3: Run production build**

Run: `bun run build`
Expected: Build succeeds

- [ ] **Step 4: Full manual test**

Run: `bun run dev`

End-to-end doubles scenario:
1. Create a doubles match (4 players)
2. Score plain points (tap sides) — no popup, team-level scoring ✓
3. Tap Ace annotation → popup shows players on that team → select player → point scored ✓
4. Tap Forehand Error annotation → popup shows players on error team → skip → point scored without attribution ✓
5. Open Stats drawer → see attributed stats per player ✓
6. Undo a point → open Stats → verify stat was removed ✓
7. Complete the match → verify all features work through to match end ✓

End-to-end singles scenario (regression):
1. Create a singles match
2. Score plain points and annotated points — no popup ever appears ✓
3. Stats button not shown ✓

- [ ] **Step 5: Commit any final fixes if needed**
