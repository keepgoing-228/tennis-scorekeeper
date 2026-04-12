import { useTranslation } from "react-i18next";
import type { Player, Team } from "../../domain/types.ts";
import type { PlayerStats } from "../../domain/tennis.ts";

type Props = {
  teams: { A: Team; B: Team };
  playerStats: Record<string, PlayerStats>;
  onClose: () => void;
};

function PlayerCard({ player, stats }: { player: Player; stats: PlayerStats | undefined }) {
  const { t } = useTranslation();
  const s = stats ?? {
    aces: 0, doubleFaults: 0, forehandWinners: 0, backhandWinners: 0,
    forehandErrors: 0, backhandErrors: 0, volleyErrors: 0, outOfBounds: 0,
    netErrors: 0, winners: 0, totalWinners: 0, totalErrors: 0, winnerErrorRatio: 0,
  };

  const ratioDisplay =
    s.winnerErrorRatio === Infinity
      ? "∞"
      : s.winnerErrorRatio.toFixed(2);

  const ratioColor =
    s.totalWinners === 0 && s.totalErrors === 0
      ? "text-gray-400"
      : s.winnerErrorRatio >= 1
        ? "text-green-400"
        : "text-red-400";

  return (
    <div className="bg-gray-700/60 rounded-lg p-3 mb-2">
      <div className="font-bold text-sm mb-2">{player.displayName}</div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div className="text-green-400 font-bold text-lg">{s.aces}</div>
          <div className="text-gray-400">{t("statAces")}</div>
        </div>
        <div>
          <div className="text-green-400 font-bold text-lg">{s.totalWinners}</div>
          <div className="text-gray-400">{t("totalWinners")}</div>
        </div>
        <div>
          <div className="text-red-400 font-bold text-lg">{s.totalErrors}</div>
          <div className="text-gray-400">{t("totalErrors")}</div>
        </div>
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-gray-600/40 text-xs text-gray-400">
        <span>{t("fhWinners")}: {s.forehandWinners} | {t("bhWinners")}: {s.backhandWinners}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{t("fhErrors")}: {s.forehandErrors} | {t("bhErrors")}: {s.backhandErrors}</span>
      </div>
      <div className="mt-1 text-xs text-gray-300">
        {t("winnerErrorRatio")}: <span className={`font-bold ${ratioColor}`}>{ratioDisplay}</span>
      </div>
    </div>
  );
}

export default function StatsDrawer({ teams, playerStats, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-t-2xl max-h-[80vh] overflow-y-auto border-t-2 border-green-500/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        <div className="text-center font-bold text-base mb-4">{t("playerStats")}</div>

        <div className="px-4 pb-6">
          {/* Team A */}
          <div className="mb-4">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
              {teams.A.players.map((p) => p.displayName).join(" / ")}
            </div>
            {teams.A.players.map((player) => (
              <PlayerCard
                key={player.playerId}
                player={player}
                stats={playerStats[player.playerId]}
              />
            ))}
          </div>

          {/* Team B */}
          <div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">
              {teams.B.players.map((p) => p.displayName).join(" / ")}
            </div>
            {teams.B.players.map((player) => (
              <PlayerCard
                key={player.playerId}
                player={player}
                stats={playerStats[player.playerId]}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
