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
