# Delete Match Feature Design

## Summary

Add the ability to delete a specific match from the Match History page. A trash icon button is always visible on each match card. Clicking it triggers a native browser `confirm()` dialog. On confirmation, the match record and all associated events are permanently deleted from IndexedDB.

## Approach

Simple delete with native `confirm()` — minimal code, no new components, consistent with the app's current simplicity.

## Details

### Storage Layer

Add `deleteMatch(matchId: string)` to `storage/matchRepo.ts`. Deletes both the `matches` table entry and all `events` for that matchId in a single Dexie transaction. Hard delete with no recovery.

### UI

Add a small trash icon button on each match card in `MatchHistory.tsx`, always visible, positioned in the top-right corner. On click:

1. Show `confirm("Delete this match?")`
2. If confirmed, call `deleteMatch(matchId)`
3. Remove the match from the displayed list

### Error Handling

If the delete fails, leave the match in the list (no optimistic removal). A `try/catch` with `console.error` is sufficient.

## Decisions

- **Location:** Match History page only
- **Confirmation:** Native browser `confirm()` dialog
- **Button visibility:** Always visible on each match card
- **Delete scope:** Match record + all events (hard delete)
