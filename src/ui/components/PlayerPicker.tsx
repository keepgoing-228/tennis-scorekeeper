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
  onEmpty?: () => void;
};

export default function PlayerPicker({
  maxPerTeam,
  teamA,
  teamB,
  onAssign,
  onRemove,
  onEmpty,
}: Props) {
  const [players, setPlayers] = useState<SavedPlayer[]>([]);
  const [popupPlayerId, setPopupPlayerId] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    getAllPlayers().then((result) => {
      setPlayers(result);
      if (result.length === 0) onEmpty?.();
    });
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
