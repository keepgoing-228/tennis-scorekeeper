# Practice Tiebreak Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Practice" mode to the Best Of selector — a standalone first-to-7 tiebreak with no 2-point margin required.

**Architecture:** Extend the existing `BestOf` type to include `"practice"`. Modify `initMatchState` to start in tiebreak mode and `scoreTiebreak` to skip the 2-point margin check for practice. UI changes: add a 4th button to Best Of row, hide tiebreak selector in practice mode, show "Practice Tiebreak" label in Scoreboard.

**Tech Stack:** TypeScript, React, Vitest (existing stack, no new deps)

---

### Task 1: Extend BestOf Type + Domain Logic (TDD)

**Files:**
- Modify: `src/domain/types.ts:3`
- Modify: `src/domain/tennis.ts:9-10,13-30,36-38,148-178`
- Modify: `src/domain/tennis.test.ts`

**Step 1: Write failing tests for practice mode**

Append to `src/domain/tennis.test.ts`:

```ts
const practiceRuleset: Ruleset = {
  bestOf: "practice",
  tiebreak: "7pt",
  matchType: "singles",
};

describe("practice tiebreak mode", () => {
  it("starts in tiebreak state", () => {
    const state = initMatchState("m1", practiceRuleset, { A: teamA, B: teamB }, "A");
    expect(state.sets[0].game.kind).toBe("tiebreak");
    if (state.sets[0].game.kind === "tiebreak") {
      expect(state.sets[0].game.tbA).toBe(0);
      expect(state.sets[0].game.tbB).toBe(0);
      expect(state.sets[0].game.target).toBe(7);
    }
  });

  it("scores tiebreak points", () => {
    let state = initMatchState("m1", practiceRuleset, { A: teamA, B: teamB }, "A");
    state = applyPointWon(state, "A");
    if (state.sets[0].game.kind === "tiebreak") {
      expect(state.sets[0].game.tbA).toBe(1);
      expect(state.sets[0].game.tbB).toBe(0);
    }
  });

  it("wins at exactly 7 points with no margin required (7-6)", () => {
    let state = initMatchState("m1", practiceRuleset, { A: teamA, B: teamB }, "A");
    // Score to 6-6
    for (let i = 0; i < 6; i++) {
      state = applyPointWon(state, "A");
      state = applyPointWon(state, "B");
    }
    // A scores 7th point → 7-6 → A wins (no margin needed)
    state = applyPointWon(state, "A");
    expect(state.status).toBe("finished");
    expect(state.winner).toBe("A");
  });

  it("does not create a second set after practice tiebreak", () => {
    let state = initMatchState("m1", practiceRuleset, { A: teamA, B: teamB }, "A");
    for (let i = 0; i < 7; i++) {
      state = applyPointWon(state, "B");
    }
    expect(state.status).toBe("finished");
    expect(state.winner).toBe("B");
    expect(state.sets).toHaveLength(1);
  });

  it("tracks server rotation in practice tiebreak", () => {
    let state = initMatchState("m1", practiceRuleset, { A: teamA, B: teamB }, "A");
    expect(state.server).toBe("A");
    // After 1st point, server changes
    state = applyPointWon(state, "A");
    expect(state.server).toBe("B");
    // After 2nd point, no change
    state = applyPointWon(state, "A");
    expect(state.server).toBe("B");
    // After 3rd point, server changes
    state = applyPointWon(state, "A");
    expect(state.server).toBe("A");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: FAIL — TypeScript error because `"practice"` is not assignable to `BestOf`

**Step 3: Extend BestOf type**

In `src/domain/types.ts`, change line 3:

```ts
export type BestOf = 1 | 3 | 5 | "practice";
```

**Step 4: Modify initMatchState for practice mode**

In `src/domain/tennis.ts`, add a `freshTiebreak` helper and modify `initMatchState`:

```ts
function freshTiebreak(): GameState {
  return { kind: "tiebreak", tbA: 0, tbB: 0, target: 7 };
}
```

Change `initMatchState` (lines 18-30) to use practice-aware initial set:

```ts
export function initMatchState(
  matchId: string,
  ruleset: Ruleset,
  teams: { A: Team; B: Team },
  server: TeamSide,
): MatchState {
  const initialGame = ruleset.bestOf === "practice" ? freshTiebreak() : freshGame();
  return {
    matchId,
    ruleset,
    teams,
    sets: [{ gamesA: 0, gamesB: 0, game: initialGame }],
    currentSetIndex: 0,
    setsWonA: 0,
    setsWonB: 0,
    server,
    status: "in_progress",
  };
}
```

**Step 5: Modify setsNeeded for practice mode**

Change `setsNeeded` (line 36-38):

```ts
function setsNeeded(ruleset: Ruleset): number {
  if (ruleset.bestOf === "practice") return 1;
  return Math.ceil(ruleset.bestOf / 2);
}
```

**Step 6: Modify scoreTiebreak for practice mode win condition**

In `scoreTiebreak` (around line 155-159), change the win condition:

```ts
  // Check for tiebreak win
  const isPractice = state.ruleset.bestOf === "practice";
  const tiebreakWon = isPractice
    ? (newTbA >= game.target || newTbB >= game.target)
    : (newTbA >= game.target || newTbB >= game.target) && Math.abs(newTbA - newTbB) >= 2;

  if (tiebreakWon) {
```

This replaces the existing single-line condition on line 159.

**Step 7: Run tests to verify they pass**

Run: `bunx vitest run src/domain/tennis.test.ts`
Expected: All tests PASS (25 existing + 5 new = 30 total)

**Step 8: Commit**

```bash
git add src/domain/ && git commit -m "feat: add practice tiebreak mode to domain logic"
```

---

### Task 2: NewMatch Page — Add Practice Button + Hide Tiebreak Selector

**Files:**
- Modify: `src/ui/pages/NewMatch.tsx:84-100,102-118`

**Step 1: Change the Best Of selector to include Practice**

In `src/ui/pages/NewMatch.tsx`, replace the Best Of `<div>` (lines 84-100) with:

```tsx
        <div>
          <label className="block text-sm font-medium mb-2">Best Of</label>
          <div className="flex gap-3">
            {([1, 3, 5] as BestOf[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBestOf(n)}
                className={`flex-1 py-2 rounded font-bold ${
                  bestOf === n ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setBestOf("practice")}
              className={`flex-1 py-2 rounded font-bold ${
                bestOf === "practice" ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              Practice
            </button>
          </div>
        </div>
```

**Step 2: Conditionally hide the Tiebreak selector**

Wrap the Tiebreak `<div>` (lines 102-118) with a condition:

```tsx
        {bestOf !== "practice" && (
          <div>
            <label className="block text-sm font-medium mb-2">Tiebreak</label>
            <div className="flex gap-3">
              {(["none", "7pt"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTiebreak(t)}
                  className={`flex-1 py-2 rounded font-bold ${
                    tiebreak === t ? "bg-blue-600" : "bg-gray-700"
                  }`}
                >
                  {t === "none" ? "None" : "7-point"}
                </button>
              ))}
            </div>
          </div>
        )}
```

**Step 3: Verify it compiles**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/ui/pages/NewMatch.tsx && git commit -m "feat: add Practice button to match creation, hide tiebreak in practice mode"
```

---

### Task 3: Scoreboard — Show "Practice Tiebreak" Label

**Files:**
- Modify: `src/ui/components/Scoreboard.tsx:20-28,44-46`

**Step 1: Replace sets row with label in practice mode**

In `src/ui/components/Scoreboard.tsx`, replace the sets display div (lines 22-28) with:

```tsx
      {state.ruleset.bestOf === "practice" ? (
        <div className="text-sm text-yellow-400 font-bold">Practice Tiebreak</div>
      ) : (
        <div className="flex justify-center gap-4 text-sm text-gray-400">
          {state.sets.map((set, i) => (
            <span key={i} className={i === state.currentSetIndex ? "text-white font-bold" : ""}>
              {set.gamesA}-{set.gamesB}
            </span>
          ))}
        </div>
      )}
```

**Step 2: Remove the duplicate "TIEBREAK" label for practice mode**

Change the tiebreak indicator (lines 44-46) to only show for non-practice tiebreaks:

```tsx
      {currentSet.game.kind === "tiebreak" && state.ruleset.bestOf !== "practice" && (
        <div className="text-xs text-yellow-400">TIEBREAK</div>
      )}
```

**Step 3: Verify it compiles**

Run: `bunx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/ui/components/Scoreboard.tsx && git commit -m "feat: show Practice Tiebreak label in scoreboard"
```

---

### Task 4: Final Verification

**Step 1: Run all tests**

Run: `bunx vitest run`
Expected: 30 tests PASS

**Step 2: Run build**

Run: `bun run build`
Expected: Build succeeds

**Step 3: Run lint**

Run: `bun run lint`
Expected: No errors

**Step 4: Manual smoke test**

Run: `bun run dev`

Test flow:
1. Open `/new` → verify [1] [3] [5] [Practice] buttons visible
2. Click "Practice" → verify Tiebreak selector disappears
3. Click "1" → verify Tiebreak selector reappears
4. Click "Practice" again, click "Start Match"
5. Verify scoreboard shows "Practice Tiebreak" label (not set scores)
6. Tap to score points → verify tiebreak point scoring works
7. Score to 7-6 → verify match ends (no 2-point margin needed)
8. Verify server rotation indicator moves during practice

**Step 5: Fix any issues found**

**Step 6: Final commit if needed**

```bash
git add -A && git commit -m "chore: final verification for practice tiebreak mode"
```
