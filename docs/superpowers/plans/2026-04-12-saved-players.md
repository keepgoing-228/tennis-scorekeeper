# Saved Players Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a player management system with a dedicated page and card-based selection in New Match, stored in Dexie IndexedDB.

**Architecture:** New `players` Dexie table (version 2 migration) with a CRUD repo. New `/players` management page added to navigation. New Match page gets a card-based player selection UI replacing the text inputs, with a manual input fallback.

**Tech Stack:** React 19, TypeScript, Dexie (IndexedDB), Tailwind CSS, Vitest, react-i18next

---

### Task 1: Data Layer — SavedPlayer Type + Dexie Migration

**Files:**
- Modify: `src/storage/db.ts`
- Create: `src/storage/playerRepo.ts`
- Create: `src/storage/playerRepo.test.ts`

- [ ] **Step 1: Write failing tests for playerRepo**

Create `src/storage/playerRepo.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db.ts";
import {
  getAllPlayers,
  addPlayer,
  updatePlayer,
  deletePlayer,
} from "./playerRepo.ts";

beforeEach(async () => {
  await db.players.clear();
});

describe("playerRepo", () => {
  it("getAllPlayers returns empty array initially", async () => {
    const players = await getAllPlayers();
    expect(players).toEqual([]);
  });

  it("addPlayer creates a player with generated id and timestamp", async () => {
    const player = await addPlayer("Alice");
    expect(player.playerId).toBeTruthy();
    expect(player.displayName).toBe("Alice");
    expect(player.createdAt).toBeTruthy();
  });

  it("getAllPlayers returns players sorted by displayName", async () => {
    await addPlayer("Charlie");
    await addPlayer("Alice");
    await addPlayer("Bob");
    const players = await getAllPlayers();
    expect(players.map((p) => p.displayName)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("updatePlayer renames a player", async () => {
    const player = await addPlayer("Alice");
    await updatePlayer(player.playerId, "Alicia");
    const players = await getAllPlayers();
    expect(players[0].displayName).toBe("Alicia");
  });

  it("deletePlayer removes a player", async () => {
    const player = await addPlayer("Alice");
    await deletePlayer(player.playerId);
    const players = await getAllPlayers();
    expect(players).toEqual([]);
  });

  it("allows duplicate display names", async () => {
    await addPlayer("David");
    await addPlayer("David");
    const players = await getAllPlayers();
    expect(players).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bunx vitest run src/storage/playerRepo.test.ts`
Expected: FAIL — module `./playerRepo.ts` not found

- [ ] **Step 3: Add SavedPlayer type and players table to db.ts**

Modify `src/storage/db.ts` — add the `SavedPlayer` type export and upgrade to version 2:

```typescript
import Dexie, { type EntityTable } from "dexie";
import type { Ruleset, Team, MatchStatus, MatchEvent } from "../domain/types.ts";

export type MatchRecord = {
  matchId: string;
  ruleset: Ruleset;
  teams: { A: Team; B: Team };
  initialServer: "A" | "B";
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
};

export type EventRecord = MatchEvent;

export type SavedPlayer = {
  playerId: string;
  displayName: string;
  createdAt: string;
};

const db = new Dexie("TennisScorekeeper") as Dexie & {
  matches: EntityTable<MatchRecord, "matchId">;
  events: EntityTable<EventRecord, "eventId">;
  players: EntityTable<SavedPlayer, "playerId">;
};

db.version(1).stores({
  matches: "matchId, status, createdAt",
  events: "eventId, [matchId+seq], matchId",
});

db.version(2).stores({
  matches: "matchId, status, createdAt",
  events: "eventId, [matchId+seq], matchId",
  players: "playerId, displayName, createdAt",
});

export { db };
```

- [ ] **Step 4: Implement playerRepo.ts**

Create `src/storage/playerRepo.ts`:

```typescript
import { db, type SavedPlayer } from "./db.ts";
import { uuid } from "../utils/uuid.ts";

export async function getAllPlayers(): Promise<SavedPlayer[]> {
  const players = await db.players.toArray();
  return players.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function addPlayer(displayName: string): Promise<SavedPlayer> {
  const player: SavedPlayer = {
    playerId: uuid(),
    displayName,
    createdAt: new Date().toISOString(),
  };
  await db.players.add(player);
  return player;
}

export async function updatePlayer(playerId: string, displayName: string): Promise<void> {
  await db.players.update(playerId, { displayName });
}

export async function deletePlayer(playerId: string): Promise<void> {
  await db.players.delete(playerId);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bunx vitest run src/storage/playerRepo.test.ts`
Expected: all 6 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/storage/db.ts src/storage/playerRepo.ts src/storage/playerRepo.test.ts
git commit -m "feat: add SavedPlayer type, Dexie v2 migration, and playerRepo CRUD"
```

---

### Task 2: i18n — Add Translation Keys

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/ja.json`

- [ ] **Step 1: Add English keys to en.json**

Add the following keys to `src/i18n/locales/en.json`:

```json
"players": "Players",
"managePlayers": "Manage Players",
"addPlayer": "Add",
"editPlayer": "Edit",
"deletePlayer": "Delete",
"playerNamePlaceholder": "Player name",
"noPlayers": "No players saved yet. Add your first player above.",
"duplicatePlayerWarning": "A player with this name already exists.",
"savedPlayers": "Saved Players",
"noSavedPlayers": "No saved players yet.",
"goToManagePlayers": "Manage Players",
"manualInput": "Or enter names manually",
"selectTeam": "Select team",
"teamFull": "Full"
```

- [ ] **Step 2: Add Chinese keys to zh.json**

Add the following keys to `src/i18n/locales/zh.json`:

```json
"players": "球員",
"managePlayers": "管理球員",
"addPlayer": "新增",
"editPlayer": "編輯",
"deletePlayer": "刪除",
"playerNamePlaceholder": "球員名稱",
"noPlayers": "尚未儲存球員。在上方新增你的第一位球員。",
"duplicatePlayerWarning": "已有同名球員。",
"savedPlayers": "已儲存球員",
"noSavedPlayers": "尚未儲存球員。",
"goToManagePlayers": "管理球員",
"manualInput": "或手動輸入名字",
"selectTeam": "選擇隊伍",
"teamFull": "已滿"
```

- [ ] **Step 3: Add Japanese keys to ja.json**

Add the following keys to `src/i18n/locales/ja.json`:

```json
"players": "選手",
"managePlayers": "選手管理",
"addPlayer": "追加",
"editPlayer": "編集",
"deletePlayer": "削除",
"playerNamePlaceholder": "選手名",
"noPlayers": "選手がまだ登録されていません。上から最初の選手を追加してください。",
"duplicatePlayerWarning": "同名の選手がすでに存在します。",
"savedPlayers": "登録済み選手",
"noSavedPlayers": "登録済みの選手がいません。",
"goToManagePlayers": "選手管理",
"manualInput": "または手動で名前を入力",
"selectTeam": "チームを選択",
"teamFull": "満員"
```

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/zh.json src/i18n/locales/ja.json
git commit -m "feat: add i18n keys for saved players feature (en/zh/ja)"
```

---

### Task 3: Player Management Page

**Files:**
- Create: `src/ui/pages/Players.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the Players page component**

Create `src/ui/pages/Players.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { SavedPlayer } from "../../storage/db.ts";
import {
  getAllPlayers,
  addPlayer,
  updatePlayer,
  deletePlayer,
} from "../../storage/playerRepo.ts";
import LanguageSwitcher from "../components/LanguageSwitcher.tsx";

export default function Players() {
  const [players, setPlayers] = useState<SavedPlayer[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    getAllPlayers().then(setPlayers);
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    const isDuplicate = players.some(
      (p) => p.displayName.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate && !duplicateWarning) {
      setDuplicateWarning(true);
      return;
    }

    await addPlayer(trimmed);
    setNewName("");
    setDuplicateWarning(false);
    setPlayers(await getAllPlayers());
  }

  async function handleUpdate(playerId: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    await updatePlayer(playerId, trimmed);
    setEditingId(null);
    setEditingName("");
    setPlayers(await getAllPlayers());
  }

  async function handleDelete(playerId: string) {
    await deletePlayer(playerId);
    setPlayers(await getAllPlayers());
  }

  function startEdit(player: SavedPlayer) {
    setEditingId(player.playerId);
    setEditingName(player.displayName);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-xl font-bold tracking-tight text-center">
          {t("managePlayers")}
        </h1>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setDuplicateWarning(false);
            }}
            placeholder={t("playerNamePlaceholder")}
            className="flex-1 bg-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-400 rounded-lg font-semibold text-sm transition-colors duration-150"
          >
            {t("addPlayer")}
          </button>
        </form>

        {duplicateWarning && (
          <p className="text-yellow-400 text-xs -mt-4">
            {t("duplicatePlayerWarning")}
          </p>
        )}

        {players.length === 0 ? (
          <p className="text-gray-500 text-center py-12 text-sm">
            {t("noPlayers")}
          </p>
        ) : (
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.playerId}
                className="bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between border border-gray-700/30"
              >
                {editingId === player.playerId ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdate(player.playerId);
                    }}
                    className="flex-1 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 bg-gray-700 rounded px-3 py-1.5 text-white text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="text-green-400 hover:text-green-300 text-xs font-medium"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-gray-500 hover:text-gray-400 text-xs font-medium"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="text-sm text-gray-200">
                      {player.displayName}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEdit(player)}
                        className="text-gray-500 hover:text-blue-400 text-xs transition-colors"
                      >
                        {t("editPlayer")}
                      </button>
                      <button
                        onClick={() => handleDelete(player.playerId)}
                        className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                      >
                        {t("deletePlayer")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <Link
          to="/new"
          className="block text-center text-sm text-gray-500 hover:text-gray-400 transition-colors"
        >
          {t("newMatch")}
        </Link>

        <LanguageSwitcher />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add /players route to App.tsx**

Modify `src/App.tsx`:

```tsx
import { HashRouter, Routes, Route, Navigate } from "react-router";
import NewMatch from "./ui/pages/NewMatch.tsx";
import Scoring from "./ui/pages/Scoring.tsx";
import MatchHistory from "./ui/pages/MatchHistory.tsx";
import Players from "./ui/pages/Players.tsx";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/new" replace />} />
        <Route path="/new" element={<NewMatch />} />
        <Route path="/match/:id" element={<Scoring />} />
        <Route path="/history" element={<MatchHistory />} />
        <Route path="/players" element={<Players />} />
      </Routes>
    </HashRouter>
  );
}
```

- [ ] **Step 3: Verify in browser**

Run: `bunx vite dev` (or existing dev server)
Navigate to `/#/players`. Verify:
- Page renders with "Manage Players" header
- Can add a player by typing name and clicking "Add"
- Player appears in list sorted alphabetically
- Can click "Edit" to inline rename
- Can click "Delete" to remove
- Adding a duplicate name shows yellow warning; clicking "Add" again confirms
- Empty state message shows when no players exist

- [ ] **Step 4: Commit**

```bash
git add src/ui/pages/Players.tsx src/App.tsx
git commit -m "feat: add player management page at /players"
```

---

### Task 4: Navigation Bar

**Files:**
- Create: `src/ui/components/NavBar.tsx`
- Modify: `src/ui/pages/NewMatch.tsx`
- Modify: `src/ui/pages/MatchHistory.tsx`
- Modify: `src/ui/pages/Players.tsx`

Currently each page has its own ad-hoc navigation links. We'll create a shared NavBar component and add it to all three pages.

- [ ] **Step 1: Create NavBar component**

Create `src/ui/components/NavBar.tsx`:

```tsx
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";

const NAV_ITEMS = [
  { path: "/new", labelKey: "newMatch" },
  { path: "/players", labelKey: "players" },
  { path: "/history", labelKey: "matchHistory" },
] as const;

export default function NavBar() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="flex justify-center gap-4 text-sm">
      {NAV_ITEMS.map(({ path, labelKey }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={`transition-colors ${
              isActive
                ? "text-blue-400 font-medium"
                : "text-gray-500 hover:text-gray-400"
            }`}
          >
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Add NavBar to NewMatch page**

In `src/ui/pages/NewMatch.tsx`:
- Add `import NavBar from "../components/NavBar.tsx";`
- Replace the `<Link to="/history" ...>` block (around line 250-255) with `<NavBar />`

- [ ] **Step 3: Add NavBar to MatchHistory page**

In `src/ui/pages/MatchHistory.tsx`:
- Add `import NavBar from "../components/NavBar.tsx";`
- Replace the `<Link to="/new" ...>` block (around line 206-210) with `<NavBar />`

- [ ] **Step 4: Add NavBar to Players page**

In `src/ui/pages/Players.tsx`:
- Add `import NavBar from "../components/NavBar.tsx";`
- Replace the `<Link to="/new" ...>` block with `<NavBar />`

- [ ] **Step 5: Verify in browser**

Navigate between all three pages. Verify:
- NavBar shows "New Match | Players | Match History" on all pages
- Current page is highlighted in blue
- All links navigate correctly

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/NavBar.tsx src/ui/pages/NewMatch.tsx src/ui/pages/MatchHistory.tsx src/ui/pages/Players.tsx
git commit -m "feat: add shared NavBar with Players link to all pages"
```

---

### Task 5: PlayerPicker Component

**Files:**
- Create: `src/ui/components/PlayerPicker.tsx`

This is the card-based player selection component used in NewMatch. It receives saved players and selected state, and calls back when players are assigned or removed.

- [ ] **Step 1: Create PlayerPicker component**

Create `src/ui/components/PlayerPicker.tsx`:

```tsx
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { SavedPlayer } from "../../storage/db.ts";
import { getAllPlayers } from "../../storage/playerRepo.ts";

type TeamSide = "A" | "B";

type Props = {
  maxPerTeam: number; // 1 for singles, 2 for doubles
  teamA: SavedPlayer[];
  teamB: SavedPlayer[];
  onAssign: (player: SavedPlayer, team: TeamSide) => void;
  onRemove: (playerId: string, team: TeamSide) => void;
};

export default function PlayerPicker({
  maxPerTeam,
  teamA,
  teamB,
  onAssign,
  onRemove,
}: Props) {
  const [players, setPlayers] = useState<SavedPlayer[]>([]);
  const [popupPlayerId, setPopupPlayerId] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    getAllPlayers().then(setPlayers);
  }, []);

  const selectedIds = new Set([
    ...teamA.map((p) => p.playerId),
    ...teamB.map((p) => p.playerId),
  ]);

  const teamAFull = teamA.length >= maxPerTeam;
  const teamBFull = teamB.length >= maxPerTeam;

  function handleCardClick(player: SavedPlayer) {
    if (selectedIds.has(player.playerId)) return;
    if (teamAFull && teamBFull) return;
    setPopupPlayerId(
      popupPlayerId === player.playerId ? null : player.playerId
    );
  }

  function handleAssign(player: SavedPlayer, team: TeamSide) {
    onAssign(player, team);
    setPopupPlayerId(null);
  }

  return (
    <div className="space-y-4">
      {/* Team display area */}
      <div className="flex gap-3">
        <div
          className={`flex-1 rounded-lg p-3 min-h-[60px] border-2 ${
            teamA.length > 0
              ? "border-blue-500/50 bg-gray-800/50"
              : "border-dashed border-gray-600"
          }`}
        >
          <div className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">
            {t("teamA")}
            {teamAFull && (
              <span className="ml-2 text-gray-500">({t("teamFull")})</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {teamA.map((p) => (
              <span
                key={p.playerId}
                className="inline-flex items-center gap-1.5 bg-blue-600/30 text-blue-200 px-3 py-1 rounded-full text-sm"
              >
                {p.displayName}
                <button
                  type="button"
                  onClick={() => onRemove(p.playerId, "A")}
                  className="text-blue-300 hover:text-white"
                >
                  ✕
                </button>
              </span>
            ))}
            {teamA.length === 0 && (
              <span className="text-gray-600 text-sm">
                {t("selectTeam")}...
              </span>
            )}
          </div>
        </div>

        <div
          className={`flex-1 rounded-lg p-3 min-h-[60px] border-2 ${
            teamB.length > 0
              ? "border-red-500/50 bg-gray-800/50"
              : "border-dashed border-gray-600"
          }`}
        >
          <div className="text-xs font-medium text-red-400 uppercase tracking-wide mb-2">
            {t("teamB")}
            {teamBFull && (
              <span className="ml-2 text-gray-500">({t("teamFull")})</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {teamB.map((p) => (
              <span
                key={p.playerId}
                className="inline-flex items-center gap-1.5 bg-red-600/30 text-red-200 px-3 py-1 rounded-full text-sm"
              >
                {p.displayName}
                <button
                  type="button"
                  onClick={() => onRemove(p.playerId, "B")}
                  className="text-red-300 hover:text-white"
                >
                  ✕
                </button>
              </span>
            ))}
            {teamB.length === 0 && (
              <span className="text-gray-600 text-sm">
                {t("selectTeam")}...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Player card pool */}
      {players.length > 0 ? (
        <div>
          <div className="text-xs text-gray-500 mb-2">{t("savedPlayers")}</div>
          <div className="flex flex-wrap gap-2">
            {players.map((player) => {
              const isSelected = selectedIds.has(player.playerId);
              const allFull = teamAFull && teamBFull;
              const disabled = isSelected || allFull;

              return (
                <div key={player.playerId} className="relative">
                  <button
                    type="button"
                    onClick={() => handleCardClick(player)}
                    disabled={disabled}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                      isSelected
                        ? "bg-gray-800/40 text-gray-600"
                        : disabled
                          ? "bg-gray-800/40 text-gray-600 cursor-not-allowed"
                          : "bg-gray-800 text-gray-200 border border-gray-700 hover:border-gray-500 active:bg-gray-700"
                    }`}
                  >
                    {player.displayName}
                    {isSelected && " ✓"}
                  </button>

                  {popupPlayerId === player.playerId && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-700 border border-gray-600 rounded-lg p-1.5 flex gap-1.5 shadow-lg z-10">
                      <button
                        type="button"
                        onClick={() => handleAssign(player, "A")}
                        disabled={teamAFull}
                        className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                          teamAFull
                            ? "bg-gray-600 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-500"
                        }`}
                      >
                        {t("teamA")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssign(player, "B")}
                        disabled={teamBFull}
                        className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                          teamBFull
                            ? "bg-gray-600 text-gray-500 cursor-not-allowed"
                            : "bg-red-600 text-white hover:bg-red-500"
                        }`}
                      >
                        {t("teamB")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm mb-2">{t("noSavedPlayers")}</p>
          <Link
            to="/players"
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            {t("goToManagePlayers")}
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the component renders**

This will be verified during Task 6 integration. No standalone test needed for a UI component — we test through the browser.

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/PlayerPicker.tsx
git commit -m "feat: add PlayerPicker card-based selection component"
```

---

### Task 6: Integrate PlayerPicker into NewMatch Page

**Files:**
- Modify: `src/ui/pages/NewMatch.tsx`

Replace the text input fields with the PlayerPicker and a manual input fallback.

- [ ] **Step 1: Rewrite NewMatch.tsx to use PlayerPicker**

Replace `src/ui/pages/NewMatch.tsx` with:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import type { BestOf, Ruleset, Team } from "../../domain/types.ts";
import { createMatch } from "../../storage/matchRepo.ts";
import { appendEvent } from "../../storage/eventRepo.ts";
import type { MatchCreatedEvent } from "../../domain/types.ts";
import type { SavedPlayer } from "../../storage/db.ts";
import { uuid } from "../../utils/uuid.ts";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher.tsx";
import NavBar from "../components/NavBar.tsx";
import PlayerPicker from "../components/PlayerPicker.tsx";

export default function NewMatch() {
  const navigate = useNavigate();
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [tiebreak, setTiebreak] = useState<"none" | "7pt">("7pt");
  const [matchType, setMatchType] = useState<"singles" | "doubles">("singles");
  const [firstServer, setFirstServer] = useState<"A" | "B">("A");
  const [practiceMode, setPracticeMode] = useState<"tiebreak" | "first_to_3">("tiebreak");
  const { t } = useTranslation();

  // Card-based selection state
  const [pickerTeamA, setPickerTeamA] = useState<SavedPlayer[]>([]);
  const [pickerTeamB, setPickerTeamB] = useState<SavedPlayer[]>([]);

  // Manual input fallback
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTeamAName, setManualTeamAName] = useState("");
  const [manualTeamBName, setManualTeamBName] = useState("");

  const maxPerTeam = matchType === "singles" ? 1 : 2;

  // Clear selections when switching between singles/doubles if over capacity
  function handleMatchTypeChange(mt: "singles" | "doubles") {
    setMatchType(mt);
    const newMax = mt === "singles" ? 1 : 2;
    if (pickerTeamA.length > newMax) setPickerTeamA(pickerTeamA.slice(0, newMax));
    if (pickerTeamB.length > newMax) setPickerTeamB(pickerTeamB.slice(0, newMax));
  }

  function handleAssign(player: SavedPlayer, team: "A" | "B") {
    if (team === "A" && pickerTeamA.length < maxPerTeam) {
      setPickerTeamA([...pickerTeamA, player]);
    } else if (team === "B" && pickerTeamB.length < maxPerTeam) {
      setPickerTeamB([...pickerTeamB, player]);
    }
  }

  function handleRemove(playerId: string, team: "A" | "B") {
    if (team === "A") {
      setPickerTeamA(pickerTeamA.filter((p) => p.playerId !== playerId));
    } else {
      setPickerTeamB(pickerTeamB.filter((p) => p.playerId !== playerId));
    }
  }

  // Determine team names from picker or manual input
  function getTeamPlayers(side: "A" | "B"): { playerId: string; displayName: string }[] {
    const pickerPlayers = side === "A" ? pickerTeamA : pickerTeamB;
    const manualName = side === "A" ? manualTeamAName.trim() : manualTeamBName.trim();

    if (pickerPlayers.length > 0) {
      return pickerPlayers.map((p) => ({ playerId: p.playerId, displayName: p.displayName }));
    }
    if (manualName) {
      return [{ playerId: uuid(), displayName: manualName }];
    }
    return [];
  }

  const teamAPlayers = getTeamPlayers("A");
  const teamBPlayers = getTeamPlayers("B");
  const canStart = teamAPlayers.length > 0 && teamBPlayers.length > 0;

  // Display names for first server buttons
  const teamADisplay = teamAPlayers.map((p) => p.displayName).join(" / ") || t("teamA");
  const teamBDisplay = teamBPlayers.map((p) => p.displayName).join(" / ") || t("teamB");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canStart) return;

    const matchId = uuid();
    const ruleset: Ruleset = {
      bestOf,
      tiebreak,
      matchType,
      ...(bestOf === "practice" ? { practiceMode } : {}),
    };
    const teamA: Team = { teamId: "A", players: teamAPlayers };
    const teamB: Team = { teamId: "B", players: teamBPlayers };

    const now = new Date().toISOString();

    await createMatch({
      matchId,
      ruleset,
      teams: { A: teamA, B: teamB },
      initialServer: firstServer,
      status: "in_progress",
      createdAt: now,
      updatedAt: now,
    });

    const event: MatchCreatedEvent = {
      eventId: uuid(),
      matchId,
      createdAt: now,
      seq: 0,
      type: "MATCH_CREATED",
      payload: { ruleset, teams: { A: teamA, B: teamB }, initialServer: firstServer },
    };
    await appendEvent(event);

    navigate(`/match/${matchId}`);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center tracking-tight">
          {t("appTitle")}
        </h1>

        {/* Match Type — placed before player selection so maxPerTeam is set */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            {t("matchType")}
          </label>
          <div className="flex">
            {(["singles", "doubles"] as const).map((mt, i) => (
              <button
                key={mt}
                type="button"
                onClick={() => handleMatchTypeChange(mt)}
                className={`flex-1 py-2 font-semibold text-sm capitalize transition-colors duration-150 ${
                  i === 0 ? "rounded-l-lg border-r border-gray-700/50" : "rounded-r-lg"
                } ${
                  matchType === mt
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {mt === "singles" ? t("singles") : t("doubles")}
              </button>
            ))}
          </div>
        </div>

        {/* Player Selection */}
        <PlayerPicker
          maxPerTeam={maxPerTeam}
          teamA={pickerTeamA}
          teamB={pickerTeamB}
          onAssign={handleAssign}
          onRemove={handleRemove}
        />

        {/* Manual input fallback */}
        <div>
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            ＋ {t("manualInput")}
          </button>
          {showManualInput && (
            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
                  {t("teamA")}
                </label>
                <input
                  type="text"
                  value={manualTeamAName}
                  onChange={(e) => setManualTeamAName(e.target.value)}
                  placeholder={t("teamA")}
                  disabled={pickerTeamA.length > 0}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-colors disabled:opacity-40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
                  {t("teamB")}
                </label>
                <input
                  type="text"
                  value={manualTeamBName}
                  onChange={(e) => setManualTeamBName(e.target.value)}
                  placeholder={t("teamB")}
                  disabled={pickerTeamB.length > 0}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-colors disabled:opacity-40"
                />
              </div>
            </div>
          )}
        </div>

        {/* Best Of */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            {t("bestOf")}
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
              {t("practice")}
            </button>
          </div>
        </div>

        {bestOf === "practice" && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              {t("practiceMode")}
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
                {t("tiebreak")}
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
                {t("firstTo3")}
              </button>
            </div>
          </div>
        )}

        {bestOf !== "practice" && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              {t("tiebreak")}
            </label>
            <div className="flex">
              {(["none", "7pt"] as const).map((tb, i) => (
                <button
                  key={tb}
                  type="button"
                  onClick={() => setTiebreak(tb)}
                  className={`flex-1 py-2 font-semibold text-sm transition-colors duration-150 ${
                    i === 0 ? "rounded-l-lg border-r border-gray-700/50" : "rounded-r-lg"
                  } ${
                    tiebreak === tb
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {tb === "none" ? t("tiebreakNone") : t("tiebreak7pt")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* First Server */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            {t("firstServer")}
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
                {s === "A" ? teamADisplay : teamBDisplay}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canStart}
          className={`w-full py-3 rounded-lg font-bold text-lg transition-colors duration-150 ${
            canStart
              ? "bg-green-600 hover:bg-green-500 active:bg-green-400"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          {t("startMatch")}
        </button>

        <NavBar />

        <LanguageSwitcher />
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser — singles flow**

Navigate to `/#/new`. Verify:
1. Match Type selector shows (singles selected by default)
2. PlayerPicker shows saved players as cards (or empty state with link to /players)
3. Click a player card → popup shows "Team A" / "Team B"
4. Select Team A → player tag appears in Team A area, card greys out
5. Select another player for Team B → tag appears in Team B area
6. "Start Match" button enables
7. Click start → navigates to scoring page with correct player names
8. First server buttons show selected player names

- [ ] **Step 3: Verify in browser — doubles flow**

1. Switch to Doubles
2. Select 2 players for Team A, 2 for Team B
3. After 4 total, remaining cards are disabled
4. Remove one player with ✕ → card becomes available again
5. Start match → scoring page shows both player names per team with " / " separator

- [ ] **Step 4: Verify in browser — manual input fallback**

1. Click "＋ Or enter names manually"
2. Type names in text fields
3. Start match with typed names
4. Verify: if picker has selections, manual inputs are disabled

- [ ] **Step 5: Verify in browser — empty state**

1. Clear all saved players from /players page
2. Go to /new
3. Verify: "No saved players yet" message with link to manage players
4. Manual input section auto-expands (or is accessible)
5. Can still start a match by typing names manually

- [ ] **Step 6: Commit**

```bash
git add src/ui/pages/NewMatch.tsx
git commit -m "feat: integrate PlayerPicker into NewMatch page"
```

---

### Task 7: Empty State Auto-Expand + Polish

**Files:**
- Modify: `src/ui/components/PlayerPicker.tsx`
- Modify: `src/ui/pages/NewMatch.tsx`

- [ ] **Step 1: Auto-expand manual input when no saved players**

In `src/ui/components/PlayerPicker.tsx`, add a callback prop to notify the parent when there are no saved players:

Add to Props type:
```typescript
onEmpty?: () => void;
```

In the `useEffect` that loads players, after `setPlayers`, if `result.length === 0` call `onEmpty?.()`.

In `src/ui/pages/NewMatch.tsx`, pass `onEmpty={() => setShowManualInput(true)}` to `<PlayerPicker />`.

- [ ] **Step 2: Verify in browser**

1. Clear all saved players
2. Navigate to /new
3. Verify: manual input section is automatically expanded
4. Add a player in /players, go back to /new
5. Verify: manual input is collapsed, card picker shows the player

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/PlayerPicker.tsx src/ui/pages/NewMatch.tsx
git commit -m "feat: auto-expand manual input when no saved players exist"
```

---

### Task 8: Run Full Test Suite + Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `bunx vitest run`
Expected: all tests pass (existing tennis.test.ts + new playerRepo.test.ts)

- [ ] **Step 2: Run type check**

Run: `bunx tsc -b`
Expected: no type errors

- [ ] **Step 3: Run lint**

Run: `bun run lint`
Expected: no lint errors (or only pre-existing ones)

- [ ] **Step 4: Full browser walkthrough**

Complete end-to-end test:
1. Navigate to /players — add 4-5 players
2. Navigate to /new — select singles, pick 2 players, start match, verify scoring works
3. Cancel/finish, navigate to /new — select doubles, pick 4 players, start match
4. Check /history — verify player names display correctly
5. Switch language to 中文 — verify all new UI text is translated
6. Switch language to 日本語 — verify all new UI text is translated
7. Navigate between all 3 pages via NavBar

- [ ] **Step 5: Commit any fixes if needed**
