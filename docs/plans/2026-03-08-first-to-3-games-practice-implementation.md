# First-to-3-Games Practice Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "first to 3 games" practice mode with normal game scoring, alongside the existing tiebreak practice mode.

**Architecture:** Add `practiceMode` field to `Ruleset` type, update scoring logic to handle `first_to_3` win condition, and add a sub-selector in the NewMatch UI when Practice is selected.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest

---

### Task 1: Add practiceMode to Ruleset type

**Files:**
- Modify: `src/domain/types.ts:5-9`

**Step 1: Update Ruleset type**

In `src/domain/types.ts`, change:

```typescript
export type Ruleset = {
  bestOf: BestOf;
  tiebreak: "none" | "7pt";
  matchType: "singles" | "doubles";
};
```

to:

```typescript
export type Ruleset = {
  bestOf: BestOf;
  tiebreak: "none" | "7pt";
  matchType: "singles" | "doubles";
  practiceMode?: "tiebreak" | "first_to_3";
};
```

**Step 2: Verify it compiles**

Run: `bun run build 2>&1 | tail -5`
Expected: Build succeeds (field is optional, so no breaking changes).

**Step 3: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat: add practiceMode field to Ruleset type"
```

---

### Task 2: Update scoring logic and add tests

**Files:**
- Modify: `src/domain/tennis.ts:17-34` (initMatchState)
- Modify: `src/domain/tennis.ts:40-43` (setsNeeded)
- Modify: `src/domain/tennis.ts:69-77` (winSet / set win check in winGame)
- Modify: `src/domain/tennis.test.ts`

**Step 1: Write failing tests for first_to_3 practice mode**

Add the following at the end of `src/domain/tennis.test.ts`:

```typescript
const firstTo3Ruleset: Ruleset = {
  bestOf: "practice",
  tiebreak: "7pt",
  matchType: "singles",
  practiceMode: "first_to_3",
};

describe("first to 3 games practice mode", () => {
  it("starts with a normal game (not tiebreak)", () => {
    const state = initMatchState("m1", firstTo3Ruleset, { A: teamA, B: teamB }, "A");
    expect(state.sets[0].game.kind).toBe("normal");
    expect(state.sets[0].game).toEqual({ kind: "normal", pointsA: 0, pointsB: 0, deuce: false });
  });

  it("uses normal game scoring (0/15/30/40)", () => {
    let state = initMatchState("m1", firstTo3Ruleset, { A: teamA, B: teamB }, "A");
    state = applyPointWon(state, "A");
    expect(state.sets[0].game).toMatchObject({ pointsA: 15, pointsB: 0 });
    state = applyPointWon(state, "A");
    expect(state.sets[0].game).toMatchObject({ pointsA: 30, pointsB: 0 });
    state = applyPointWon(state, "A");
    expect(state.sets[0].game).toMatchObject({ pointsA: 40, pointsB: 0 });
  });

  it("supports deuce and advantage", () => {
    let state = initMatchState("m1", firstTo3Ruleset, { A: teamA, B: teamB }, "A");
    state = scorePoints(state, ["A", "A", "A", "B", "B", "B"]);
    expect(state.sets[0].game).toMatchObject({ pointsA: 40, pointsB: 40, deuce: true });
    state = applyPointWon(state, "A");
    expect(state.sets[0].game).toMatchObject({ pointsA: "AD", pointsB: 40 });
  });

  it("alternates server after each game", () => {
    let state = initMatchState("m1", firstTo3Ruleset, { A: teamA, B: teamB }, "A");
    expect(state.server).toBe("A");
    state = scorePoints(state, ["A", "A", "A", "A"]); // A wins game 1
    expect(state.server).toBe("B");
    state = scorePoints(state, ["B", "B", "B", "B"]); // B wins game 2
    expect(state.server).toBe("A");
  });

  it("wins match when a player reaches 3 games", () => {
    let state = initMatchState("m1", firstTo3Ruleset, { A: teamA, B: teamB }, "A");
    state = winGames(state, "A", 3);
    expect(state.status).toBe("finished");
    expect(state.winner).toBe("A");
  });

  it("does not require 2-game margin", () => {
    let state = initMatchState("m1", firstTo3Ruleset, { A: teamA, B: teamB }, "A");
    state = winGames(state, "A", 2);
    state = winGames(state, "B", 2);
    // Score is 2-2, A wins next game -> 3-2 -> A wins
    state = winGames(state, "A", 1);
    expect(state.status).toBe("finished");
    expect(state.winner).toBe("A");
    expect(state.sets[0].gamesA).toBe(3);
    expect(state.sets[0].gamesB).toBe(2);
  });

  it("stays in single set (no new set created)", () => {
    let state = initMatchState("m1", firstTo3Ruleset, { A: teamA, B: teamB }, "A");
    state = winGames(state, "B", 3);
    expect(state.status).toBe("finished");
    expect(state.winner).toBe("B");
    expect(state.sets).toHaveLength(1);
  });

  it("ignores points after match is finished", () => {
    let state = initMatchState("m1", firstTo3Ruleset, { A: teamA, B: teamB }, "A");
    state = winGames(state, "A", 3);
    const finishedState = state;
    state = applyPointWon(state, "B");
    expect(state).toEqual(finishedState);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun run test 2>&1`
Expected: New tests fail because `initMatchState` with `practiceMode: "first_to_3"` still starts a tiebreak (since `bestOf === "practice"`).

**Step 3: Update initMatchState**

In `src/domain/tennis.ts`, change `initMatchState` (line 27) from:

```typescript
    sets: [{ gamesA: 0, gamesB: 0, game: ruleset.bestOf === "practice" ? freshTiebreak() : freshGame() }],
```

to:

```typescript
    sets: [{ gamesA: 0, gamesB: 0, game: ruleset.bestOf === "practice" && ruleset.practiceMode !== "first_to_3" ? freshTiebreak() : freshGame() }],
```

**Step 4: Update winGame to handle first_to_3 win condition**

In `src/domain/tennis.ts`, the `winGame` function checks for set wins. We need to add a check for `first_to_3` before the existing set win logic. Inside `winGame`, after incrementing the game count (after line 53), add a new check before the tiebreak check (before line 59):

Change:

```typescript
  // Check for set win
  const { gamesA, gamesB } = currentSet;

  // first state: tiebreak is enabled and both players have 6 games
  const needsTiebreak = state.ruleset.tiebreak === "7pt" && gamesA === 6 && gamesB === 6;
```

to:

```typescript
  // Check for set win
  const { gamesA, gamesB } = currentSet;

  // first_to_3 practice mode: win at 3 games, no margin needed
  if (state.ruleset.bestOf === "practice" && state.ruleset.practiceMode === "first_to_3") {
    if (gamesA >= 3 || gamesB >= 3) {
      const ftWinner: TeamSide = gamesA > gamesB ? "A" : "B";
      currentSet.game = freshGame();
      sets[state.currentSetIndex] = currentSet;
      return winSet(state, sets, ftWinner);
    }
    // Continue playing — start new game
    currentSet.game = freshGame();
    sets[state.currentSetIndex] = currentSet;
    return { ...state, sets, server: otherSide(state.server) };
  }

  // first state: tiebreak is enabled and both players have 6 games
  const needsTiebreak = state.ruleset.tiebreak === "7pt" && gamesA === 6 && gamesB === 6;
```

**Step 5: Run tests to verify they pass**

Run: `bun run test 2>&1`
Expected: All tests pass (existing + new).

**Step 6: Commit**

```bash
git add src/domain/tennis.ts src/domain/tennis.test.ts
git commit -m "feat: add first-to-3-games practice mode scoring logic"
```

---

### Task 3: Update NewMatch UI with practice mode sub-selector

**Files:**
- Modify: `src/ui/pages/NewMatch.tsx`

**Step 1: Add practiceMode state**

In `src/ui/pages/NewMatch.tsx`, after line 15 (`const [firstServer, ...`), add:

```typescript
  const [practiceMode, setPracticeMode] = useState<"tiebreak" | "first_to_3">("tiebreak");
```

**Step 2: Include practiceMode in ruleset**

In `handleSubmit`, change line 21 from:

```typescript
    const ruleset: Ruleset = { bestOf, tiebreak, matchType };
```

to:

```typescript
    const ruleset: Ruleset = {
      bestOf,
      tiebreak,
      matchType,
      ...(bestOf === "practice" ? { practiceMode } : {}),
    };
```

**Step 3: Add the sub-selector UI**

After the Best Of section's closing `</div>` (after line 125), add:

```tsx
        {bestOf === "practice" && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              Practice Mode
            </label>
            <div className="flex">
              <button
                type="button"
                onClick={() => setPracticeMode("tiebreak")}
                className={`flex-1 py-2 rounded-l-lg font-semibold text-sm transition-colors duration-150 border-r border-gray-700/50 ${
                  practiceMode === "tiebreak"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Tiebreak
              </button>
              <button
                type="button"
                onClick={() => setPracticeMode("first_to_3")}
                className={`flex-1 py-2 rounded-r-lg font-semibold text-sm transition-colors duration-150 ${
                  practiceMode === "first_to_3"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                First to 3
              </button>
            </div>
          </div>
        )}
```

**Step 4: Verify build**

Run: `bun run build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 5: Run tests**

Run: `bun run test 2>&1`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/ui/pages/NewMatch.tsx
git commit -m "feat: add practice mode sub-selector in NewMatch page"
```

---

### Task 4: Update Scoreboard label for first_to_3

**Files:**
- Modify: `src/ui/components/Scoreboard.tsx`

**Step 1: Read current Scoreboard code**

Read `src/ui/components/Scoreboard.tsx` to find where "Practice Tiebreak" label is shown.

**Step 2: Update the label**

Find the practice mode label and change it to show "Practice Tiebreak" or "First to 3 Games" based on `state.ruleset.practiceMode`.

If current code is:

```typescript
{state.ruleset.bestOf === "practice" && <span>Practice Tiebreak</span>}
```

Change to:

```typescript
{state.ruleset.bestOf === "practice" && (
  <span>{state.ruleset.practiceMode === "first_to_3" ? "First to 3 Games" : "Practice Tiebreak"}</span>
)}
```

**Step 3: Update match history label**

In `src/ui/pages/MatchHistory.tsx`, the `getMatchTypeLabel` function (line 24-27) returns "Practice Tiebreak" for all practice modes. Update:

```typescript
function getMatchTypeLabel(record: MatchRecord): string {
  if (record.ruleset.bestOf === "practice") {
    return record.ruleset.practiceMode === "first_to_3" ? "First to 3 Games" : "Practice Tiebreak";
  }
  return `Best of ${record.ruleset.bestOf}`;
}
```

**Step 4: Verify build and tests**

Run: `bun run build 2>&1 && bun run test 2>&1`
Expected: Build succeeds, all tests pass.

**Step 5: Commit**

```bash
git add src/ui/components/Scoreboard.tsx src/ui/pages/MatchHistory.tsx
git commit -m "feat: update labels for first-to-3 practice mode"
```

---

### Task 5: Manual verification

**Step 1: Start dev server**

Run: `bun run dev`

**Step 2: Test checklist**

1. Select Practice in Best Of → sub-selector appears (Tiebreak / First to 3)
2. Select "First to 3" → start match
3. Verify normal game scoring (0/15/30/40/deuce/AD)
4. Verify server alternates after each game
5. Win 3 games → match finishes, winner overlay shows
6. Check match history → shows "First to 3 Games" label
7. Switch back to Tiebreak practice → verify it still works as before
8. Select Best of 1/3/5 → sub-selector disappears
