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
