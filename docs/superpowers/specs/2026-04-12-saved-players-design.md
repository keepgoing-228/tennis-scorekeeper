# Saved Players — Design Spec

## Summary

Add a player management system so users can save frequently used player names and quickly select them when creating new matches, instead of typing names manually each time. For doubles, users pick from the saved player list to form teams.

## Data Layer

### New Dexie `players` Table

Upgrade to `db.version(2)`:

```typescript
db.version(2).stores({
  matches: "matchId, status, createdAt",
  events: "eventId, [matchId+seq], matchId",
  players: "playerId, displayName, createdAt",
});
```

### SavedPlayer Type

```typescript
interface SavedPlayer {
  playerId: string;   // uuid
  displayName: string;
  createdAt: string;  // ISO timestamp
}
```

### playerRepo.ts

CRUD operations:

- `getAllPlayers()` — returns all players sorted by `displayName`
- `addPlayer(displayName)` — creates new player with auto-generated `playerId` + `createdAt`
- `updatePlayer(playerId, displayName)` — rename a player
- `deletePlayer(playerId)` — remove a player

No deduplication enforcement. Duplicate names are allowed (different people can share names). On add, show a warning "已有同名球員" if a player with the same name exists, but don't block.

## Player Management Page

### Route

`/players` — accessible from the navigation bar.

### Navigation Bar Order

New Match | **Players** | History

Players sits between New Match and History — it's a preparation step before starting a match.

### Page Features

- **Player list** — all saved players displayed in a list, sorted by name
- **Add input** — text input + "Add" button at the top to create new players
- **Edit** — inline rename: click edit → input field appears → confirm to save
- **Delete** — click delete to remove immediately (no confirmation dialog; low cost to re-add)
- **Empty state** — when no players exist, show guidance text prompting the user to add their first player

### i18n

All UI text uses i18next keys. Translations provided for en, zh, ja.

## New Match Page — Player Selection

### UI Structure

The player name input area is replaced with a card-based selection interface:

1. **Team display area (top)** — two boxes side by side showing Team A and Team B. Each displays selected player names as tags with ✕ to remove. Empty state shows placeholder text.

2. **Player card pool (middle)** — all saved players shown as tappable cards. Already-selected players are greyed out with a checkmark.

3. **Manual input fallback (bottom)** — a collapsible "＋ 或手動輸入名字" link. Expands to show text input fields for typing names directly. Names entered here are used for the current match only — they are NOT saved to the player database.

### Selection Flow

1. User taps a player card
2. A popup appears with two buttons: "Team A" (blue) and "Team B" (red)
3. User picks a team → player appears in the team display area, card greys out in the pool
4. To remove: tap ✕ on the player tag in the team area → card becomes available again

### Capacity Rules

- **Singles:** each team must have exactly 1 player (max 2 total)
- **Doubles:** each team must have exactly 2 players (max 4 total)
- Match cannot start until both teams are full
- When both teams are full, all remaining cards in the pool are disabled
- When a team is full, its option in the popup is disabled

### Match Type Interaction

The user selects singles/doubles first (existing UI), which determines the capacity per team. The player card pool and team display areas reflect the current match type.

## Edge Cases

1. **No saved players** — card pool shows "還沒有儲存球員" with a link to `/players`. Manual input section auto-expands so the user can still start a match by typing names.

2. **Teams full** — all remaining pool cards become disabled. User must remove a selected player (✕) before selecting a new one.

3. **Deleting a player who is in an active match** — no effect on in-progress matches. Player names are copied into the match record at creation time. Deletion only affects future selections.

4. **Duplicate names on add** — allowed, but show a warning "已有同名球員" to let the user confirm intent.

## Out of Scope

- Player statistics or match history per player
- Player avatars or profile pictures
- Import/export player lists
- Auto-saving manually typed names to the player database
