# Delete Match Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to delete a specific match from the Match History page with a confirmation dialog.

**Architecture:** Add a `deleteMatch` function to the storage layer that removes both the match record and all associated events in a single Dexie transaction. Add a trash icon button to each match card in MatchHistory that triggers a native `confirm()` dialog before deleting.

**Tech Stack:** React, Dexie (IndexedDB), TypeScript, Vitest

---

### Task 1: Add `deleteMatch` to storage layer

**Files:**
- Modify: `src/storage/matchRepo.ts`

**Step 1: Write the implementation**

Add this function to the end of `src/storage/matchRepo.ts`:

```typescript
export async function deleteMatch(matchId: string): Promise<void> {
  await db.transaction("rw", db.matches, db.events, async () => {
    await db.events.where("matchId").equals(matchId).delete();
    await db.matches.delete(matchId);
  });
}
```

**Step 2: Commit**

```bash
git add src/storage/matchRepo.ts
git commit -m "feat: add deleteMatch to storage layer"
```

---

### Task 2: Add delete button to MatchHistory UI

**Files:**
- Modify: `src/ui/pages/MatchHistory.tsx`

**Step 1: Add the `deleteMatch` import**

At line 5 of `MatchHistory.tsx`, update the import from `matchRepo.ts`:

```typescript
import { getCompletedMatches, deleteMatch } from "../../storage/matchRepo.ts";
```

**Step 2: Add the delete handler function**

Inside the `MatchHistory` component (after the `toggleExpand` function around line 81), add:

```typescript
async function handleDelete(matchId: string) {
  if (!confirm("Delete this match? This cannot be undone.")) return;
  try {
    await deleteMatch(matchId);
    setMatches((prev) => prev.filter((m) => m.record.matchId !== matchId));
    if (expandedId === matchId) setExpandedId(null);
  } catch (err) {
    console.error("Failed to delete match:", err);
  }
}
```

**Step 3: Add the delete button to each match card**

In the match card JSX, add a delete button. Replace the `<div key={record.matchId}>` block (lines 106-135) with:

```tsx
<div key={record.matchId}>
  <div className="relative">
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
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleDelete(record.matchId);
      }}
      className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 transition-colors"
      aria-label="Delete match"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
      </svg>
    </button>
  </div>

  {expandedId === record.matchId && stats[record.matchId] && (
    <StatsDetail
      stats={stats[record.matchId]}
      teamAName={record.teams.A.players.map((p) => p.displayName).join(" / ")}
      teamBName={record.teams.B.players.map((p) => p.displayName).join(" / ")}
    />
  )}
</div>
```

**Step 4: Commit**

```bash
git add src/ui/pages/MatchHistory.tsx
git commit -m "feat: add delete button to match history"
```

---

### Task 3: Manual verification

**Step 1: Run type check and build**

```bash
bun run build
```

Expected: No type errors, successful build.

**Step 2: Run existing tests**

```bash
bun run test
```

Expected: All existing tests pass.

**Step 3: Manual test in browser**

1. Run `bun run dev`
2. Navigate to Match History
3. Verify trash icon appears on each match card
4. Click trash icon — confirm dialog appears
5. Click Cancel — match remains
6. Click OK — match disappears from the list
7. Refresh page — deleted match stays gone
