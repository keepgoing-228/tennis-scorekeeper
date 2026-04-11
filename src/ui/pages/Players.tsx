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
