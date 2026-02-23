# UI Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the app feel more polished and modern with better spacing, typography, and color harmony — all via Tailwind class refinements, no new dependencies.

**Architecture:** Pure styling changes across 6 existing files. No logic changes, no new components, no new dependencies. Each task modifies one file.

**Tech Stack:** Tailwind CSS 4.2, React 19, TypeScript

---

### Task 1: Scoreboard — Remove game point, polish layout

**Files:**
- Modify: `src/ui/components/Scoreboard.tsx`

**Step 1: Update Scoreboard component**

Remove the game point score display (lines 34-46) and polish the remaining layout. The scoreboard should only show set scores and team names with server indicator.

```tsx
import type { MatchState } from "../../domain/types.ts";

type Props = {
  state: MatchState;
};

export default function Scoreboard({ state }: Props) {
  const teamAName = state.teams.A.players.map((p) => p.displayName).join(" / ");
  const teamBName = state.teams.B.players.map((p) => p.displayName).join(" / ");

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm px-4 py-3 space-y-1.5">
      {state.ruleset.bestOf === "practice" ? (
        <div className="text-sm text-yellow-400 font-semibold text-center tracking-wide">
          Practice Tiebreak
        </div>
      ) : (
        <div className="flex justify-center gap-5 text-sm text-gray-400 font-mono">
          {state.sets.map((set, i) => (
            <span
              key={i}
              className={
                i === state.currentSetIndex
                  ? "text-white font-bold"
                  : ""
              }
            >
              {set.gamesA}-{set.gamesB}
            </span>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center text-base font-semibold px-2">
        <div className="flex items-center gap-2">
          {state.server === "A" && (
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          )}
          <span className="text-gray-200">{teamAName}</span>
        </div>
        <span className="text-xs text-gray-500 uppercase tracking-wider">vs</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-200">{teamBName}</span>
          {state.server === "B" && (
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          )}
        </div>
      </div>

      {state.sets[state.currentSetIndex].game.kind === "tiebreak" &&
        state.ruleset.bestOf !== "practice" && (
          <div className="text-xs text-yellow-400 text-center font-semibold tracking-widest">
            TIEBREAK
          </div>
        )}
    </div>
  );
}
```

**Step 2: Verify visually**

Run: `bun run dev`
Check: Scoreboard shows only set scores and team names. No game point displayed. Server indicator is a small yellow dot. Layout is clean.

**Step 3: Run tests**

Run: `bun run test`
Expected: All existing tests pass (Scoreboard has no direct tests; domain tests unaffected).

**Step 4: Commit**

```bash
git add src/ui/components/Scoreboard.tsx
git commit -m "style: remove game point from scoreboard and polish layout"
```

---

### Task 2: ScoreButton — Subtle team color distinction

**Files:**
- Modify: `src/ui/components/ScoreButton.tsx`

**Step 1: Update ScoreButton with new color scheme**

Replace the bright blue/red with subtle slate (cool) vs stone (warm) tints.

```tsx
import type { SetState, TeamSide } from "../../domain/types.ts";

function getDisplayScore(game: SetState["game"], side: TeamSide): string {
  if (game.kind === "tiebreak") {
    return String(side === "A" ? game.tbA : game.tbB);
  }
  const points = side === "A" ? game.pointsA : game.pointsB;
  return points === "AD" ? "AD" : String(points);
}

type Props = {
  teamName: string;
  side: TeamSide;
  game: SetState["game"];
  disabled: boolean;
  onScore: () => void;
};

export default function ScoreButton({ teamName, side, game, disabled, onScore }: Props) {
  const score = getDisplayScore(game, side);

  return (
    <button
      onClick={onScore}
      disabled={disabled}
      className={`flex-1 flex flex-col items-center justify-center gap-3 text-white transition-colors duration-150 ${
        side === "A"
          ? "bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border-r border-slate-700/50"
          : "bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border-l border-stone-700/50"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="text-sm font-semibold tracking-wide text-gray-300 uppercase">
        {teamName}
      </span>
      <span className="text-8xl font-mono font-bold tabular-nums">{score}</span>
    </button>
  );
}
```

**Step 2: Verify visually**

Run: `bun run dev`
Check: Two buttons have a subtle cool/warm distinction. Team names are smaller uppercase. Score numbers are large and prominent. Active states feel responsive.

**Step 3: Run tests**

Run: `bun run test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/ui/components/ScoreButton.tsx
git commit -m "style: use subtle slate/stone colors for score buttons"
```

---

### Task 3: AnnotationBar — Minor polish

**Files:**
- Modify: `src/ui/components/AnnotationBar.tsx`

**Step 1: Polish annotation bar styling**

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
    <div className="bg-gray-800/80 backdrop-blur-sm px-3 py-2.5 flex flex-wrap justify-center gap-2">
      {REASONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 transition-colors duration-150"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Run tests**

Run: `bun run test`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/ui/components/AnnotationBar.tsx
git commit -m "style: polish annotation bar with better spacing and colors"
```

---

### Task 4: Scoring page — Bottom bar and finished overlay

**Files:**
- Modify: `src/ui/pages/Scoring.tsx`

**Step 1: Update bottom action bar and match finished overlay**

Only the JSX return needs to change. Keep all logic (hooks, handlers, state) exactly the same. Replace the return statement starting at `return (` (line 151) through end of component.

```tsx
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

      {/* Giant score buttons */}
      <div className="flex flex-1">
        <ScoreButton
          teamName={teamAName}
          side="A"
          game={currentSet.game}
          disabled={isFinished}
          onScore={() => handleScore("A")}
        />
        <ScoreButton
          teamName={teamBName}
          side="B"
          game={currentSet.game}
          disabled={isFinished}
          onScore={() => handleScore("B")}
        />
      </div>

      {/* Annotation bar */}
      {lastPointEventId && !isLastPointAnnotated && (
        <AnnotationBar onSelect={handleAnnotate} />
      )}

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
```

**Step 2: Verify visually**

Run: `bun run dev`
Check: Bottom bar has subtle gap between buttons, Restart is text-red (not bg-red), Undo has arrow icon. Finished overlay is a rounded card.

**Step 3: Run tests**

Run: `bun run test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/ui/pages/Scoring.tsx
git commit -m "style: polish scoring page bottom bar and finished overlay"
```

---

### Task 5: NewMatch page — Title, form, and button styling

**Files:**
- Modify: `src/ui/pages/NewMatch.tsx`

**Step 1: Update the full return JSX**

Keep all logic (hooks, state, handleSubmit) exactly the same. Replace only the return statement (line 56 onward).

```tsx
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center tracking-tight">
          Tennis Scorekeeper
        </h1>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
              Team A
            </label>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
              Team B
            </label>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Best Of
          </label>
          <div className="flex">
            {([1, 3, 5] as BestOf[]).map((n, i) => (
              <button
                key={n}
                type="button"
                onClick={() => setBestOf(n)}
                className={`flex-1 py-2 font-semibold text-sm transition-colors duration-150 ${
                  i === 0 ? "rounded-l-lg" : ""
                } ${
                  bestOf === n
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                } border-r border-gray-700/50`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setBestOf("practice")}
              className={`flex-1 py-2 rounded-r-lg font-semibold text-sm transition-colors duration-150 ${
                bestOf === "practice"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Practice
            </button>
          </div>
        </div>

        {bestOf !== "practice" && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              Tiebreak
            </label>
            <div className="flex">
              {(["none", "7pt"] as const).map((t, i) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTiebreak(t)}
                  className={`flex-1 py-2 font-semibold text-sm transition-colors duration-150 ${
                    i === 0 ? "rounded-l-lg border-r border-gray-700/50" : "rounded-r-lg"
                  } ${
                    tiebreak === t
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {t === "none" ? "None" : "7-point"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            Match Type
          </label>
          <div className="flex">
            {(["singles", "doubles"] as const).map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setMatchType(t)}
                className={`flex-1 py-2 font-semibold text-sm capitalize transition-colors duration-150 ${
                  i === 0 ? "rounded-l-lg border-r border-gray-700/50" : "rounded-r-lg"
                } ${
                  matchType === t
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            First Server
          </label>
          <div className="flex">
            {(["A", "B"] as const).map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setFirstServer(s)}
                className={`flex-1 py-2 font-semibold text-sm transition-colors duration-150 ${
                  i === 0 ? "rounded-l-lg border-r border-gray-700/50" : "rounded-r-lg"
                } ${
                  firstServer === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {s === "A" ? teamAName : teamBName}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-green-600 hover:bg-green-500 active:bg-green-400 rounded-lg font-bold text-lg transition-colors duration-150"
        >
          Start Match
        </button>

        <Link
          to="/history"
          className="block text-center text-sm text-gray-500 hover:text-gray-400 transition-colors"
        >
          Match History
        </Link>
      </form>
    </div>
  );
```

**Step 2: Verify visually**

Run: `bun run dev`
Check: Title says "Tennis Scorekeeper". Segmented controls have proper rounded edges. Labels are small uppercase. Focus rings on inputs. Match History link at bottom.

**Step 3: Run tests**

Run: `bun run test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/ui/pages/NewMatch.tsx
git commit -m "style: polish new match page with segmented controls and new title"
```

---

### Task 6: MatchHistory page — Cards, table, and layout

**Files:**
- Modify: `src/ui/pages/MatchHistory.tsx`

**Step 1: Update the return JSX of MatchHistory component**

Keep all logic (hooks, state, handlers, helpers) the same. Replace the main return (line 107 onward, but not StatsDetail).

```tsx
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Match History</h1>
          <Link
            to="/new"
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            New Match
          </Link>
        </div>

        {matches.length === 0 ? (
          <p className="text-gray-500 text-center py-12 text-sm">
            No completed matches yet.
          </p>
        ) : (
          <div className="space-y-2">
            {matches.map(({ record, setScores, winnerName, matchTypeLabel }) => (
              <div key={record.matchId}>
                <div className="relative">
                  <button
                    onClick={() => toggleExpand(record.matchId)}
                    className="w-full bg-gray-800 rounded-lg p-3.5 text-left hover:bg-gray-750 transition-colors duration-150 border border-gray-700/30"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-sm text-gray-200">
                          {record.teams.A.players.map((p) => p.displayName).join(" / ")}
                          {" vs "}
                          {record.teams.B.players.map((p) => p.displayName).join(" / ")}
                        </div>
                        <div className="text-lg font-mono mt-1 tabular-nums">
                          {setScores}
                        </div>
                      </div>
                      <div className="text-right text-xs pr-7">
                        <div className="text-green-400 font-medium">
                          {winnerName} wins
                        </div>
                        <div className="text-gray-500 mt-0.5">{matchTypeLabel}</div>
                        <div className="text-gray-600 mt-0.5">
                          {formatDate(record.createdAt)}
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(record.matchId);
                    }}
                    className="absolute top-2.5 right-2.5 p-1 text-gray-600 hover:text-red-400 transition-colors duration-150"
                    aria-label="Delete match"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                {expandedId === record.matchId && stats[record.matchId] && (
                  <StatsDetail
                    stats={stats[record.matchId]}
                    teamAName={record.teams.A.players
                      .map((p) => p.displayName)
                      .join(" / ")}
                    teamBName={record.teams.B.players
                      .map((p) => p.displayName)
                      .join(" / ")}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
```

**Step 2: Update StatsDetail component**

Replace the StatsDetail function (keep STAT_LABELS and types the same):

```tsx
function StatsDetail({ stats, teamAName, teamBName }: StatsDetailProps) {
  return (
    <div className="bg-gray-800/60 rounded-b-lg px-3 py-2 mt-px border-x border-b border-gray-700/30">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-700/50">
            <th className="text-left py-1.5 font-medium">&nbsp;</th>
            <th className="text-center py-1.5 font-medium">{teamAName}</th>
            <th className="text-center py-1.5 font-medium">{teamBName}</th>
          </tr>
        </thead>
        <tbody>
          {STAT_LABELS.map(({ key, label }, i) => (
            <tr
              key={key}
              className={`border-b border-gray-800/50 ${
                i % 2 === 0 ? "bg-gray-800/30" : ""
              }`}
            >
              <td className="py-1.5 text-gray-400">{label}</td>
              <td className="text-center font-mono tabular-nums">{stats.A[key]}</td>
              <td className="text-center font-mono tabular-nums">{stats.B[key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 3: Verify visually**

Run: `bun run dev`
Check: Match cards have subtle border. Stats table has alternating row backgrounds. Delete icon is smaller and more subtle. Empty state is less prominent.

**Step 4: Run tests**

Run: `bun run test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/ui/pages/MatchHistory.tsx
git commit -m "style: polish match history cards, stats table, and layout"
```

---

### Task 7: Final verification

**Step 1: Run full test suite**

Run: `bun run test`
Expected: All tests pass with no regressions.

**Step 2: Build check**

Run: `bun run build`
Expected: Build succeeds with no errors or warnings.

**Step 3: Visual walkthrough**

Run: `bun run dev`
Manually check all three pages:
- New Match: title says "Tennis Scorekeeper", segmented controls, polished inputs
- Scoring: no game point in scoreboard, subtle button colors, polished bottom bar
- Match History: cleaner cards, better table styling
