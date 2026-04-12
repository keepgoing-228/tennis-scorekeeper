import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import NavBar from "../components/NavBar.tsx";
import type { MatchRecord } from "../../storage/db.ts";
import type { MatchStats, TeamStats, PlayerStats } from "../../domain/tennis.ts";
import { getCompletedMatches, deleteMatch, deleteAllMatches } from "../../storage/matchRepo.ts";
import { getMatchEvents } from "../../storage/eventRepo.ts";
import { computeMatchStats, computePlayerStats, getEffectiveEvents, replay } from "../../domain/tennis.ts";
import type { Team } from "../../domain/types.ts";

type MatchSummary = {
  record: MatchRecord;
  setScores: string;
  winnerName: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MatchHistory() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, MatchStats>>({});
  const [playerStatsMap, setPlayerStatsMap] = useState<Record<string, Record<string, PlayerStats>>>({});
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    async function load() {
      const records = await getCompletedMatches();
      const summaries: MatchSummary[] = [];

      for (const record of records) {
        const events = await getMatchEvents(record.matchId);
        const effective = getEffectiveEvents(events);
        const state = replay(effective);

        const setScores = state.sets
          .map((s) => `${s.gamesA}-${s.gamesB}`)
          .join(", ");

        const winnerTeam = state.winner;
        const winnerName = winnerTeam
          ? record.teams[winnerTeam].players.map((p) => p.displayName).join(" / ")
          : "Unknown";

        summaries.push({
          record,
          setScores,
          winnerName,
        });
      }

      setMatches(summaries);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleExpand(matchId: string) {
    if (expandedId === matchId) {
      setExpandedId(null);
      return;
    }

    if (!stats[matchId]) {
      const events = await getMatchEvents(matchId);
      const matchStats = computeMatchStats(events);
      setStats((prev) => ({ ...prev, [matchId]: matchStats }));
      const pStats = computePlayerStats(events);
      setPlayerStatsMap((prev) => ({ ...prev, [matchId]: pStats }));
    }

    setExpandedId(matchId);
  }

  async function handleDeleteAll() {
    if (!confirm(t('confirmDeleteAll'))) return;
    try {
      await deleteAllMatches();
      setMatches([]);
      setExpandedId(null);
      setStats({});
      setPlayerStatsMap({});
    } catch (err) {
      console.error("Failed to delete all matches:", err);
    }
  }

  async function handleDelete(matchId: string) {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await deleteMatch(matchId);
      setMatches((prev) => prev.filter((m) => m.record.matchId !== matchId));
      if (expandedId === matchId) setExpandedId(null);
      setStats((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
      setPlayerStatsMap((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    } catch (err) {
      console.error("Failed to delete match:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold tracking-tight text-center">{t('matchHistory')}</h1>

        {matches.length === 0 ? (
          <p className="text-gray-500 text-center py-12 text-sm">
            {t('noMatches')}
          </p>
        ) : (
          <div className="space-y-2">
            {matches.map(({ record, setScores, winnerName }) => (
              <div key={record.matchId}>
                <div className="relative">
                  <button
                    onClick={() => toggleExpand(record.matchId)}
                    className="w-full bg-gray-800 rounded-lg p-3.5 text-left hover:bg-gray-750 transition-colors duration-150 border border-gray-700/30"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-sm text-gray-200">
                          {record.teams.A.players.map((p) => p.displayName).join(" / ")}
                          {` ${t('vs')} `}
                          {record.teams.B.players.map((p) => p.displayName).join(" / ")}
                        </div>
                        <div className="text-lg font-mono mt-1 tabular-nums">
                          {setScores}
                        </div>
                      </div>
                      <div className="text-right text-xs pr-7">
                        <div className="text-green-400 font-medium">
                          {t('winnerSummary', { winnerName })}
                        </div>
                        <div className="text-gray-500 mt-0.5">
                          {record.ruleset.bestOf === "practice"
                            ? (record.ruleset.practiceMode === "first_to_3" ? t("firstTo3Games") : t("practiceTiebreak"))
                            : t("bestOfN", { n: record.ruleset.bestOf })}
                        </div>
                        <div className="text-gray-600 mt-0.5">
                          {formatDate(record.createdAt)}
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(record.matchId);
                    }}
                    className="absolute top-2.5 right-2.5 p-1 text-gray-600 hover:text-red-400 transition-colors duration-150"
                    aria-label={t('deleteMatch')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                {expandedId === record.matchId && stats[record.matchId] && (
                  <StatsDetail
                    stats={stats[record.matchId]}
                    teamAName={record.teams.A.players
                      .map((p) => p.displayName)
                      .join(" / ")}
                    teamBName={record.teams.B.players
                      .map((p) => p.displayName)
                      .join(" / ")}
                    teams={record.ruleset.matchType === "doubles" ? record.teams : undefined}
                    playerStats={playerStatsMap[record.matchId]}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {matches.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="block w-full text-center text-sm text-red-500/60 hover:text-red-400 transition-colors"
          >
            {t('deleteAll')}
          </button>
        )}

        <NavBar />
      </div>
    </div>
  );
}

type StatsDetailProps = {
  stats: MatchStats;
  teamAName: string;
  teamBName: string;
  teams?: { A: Team; B: Team };
  playerStats?: Record<string, PlayerStats>;
};

const STAT_LABELS: { key: keyof TeamStats; labelKey: string }[] = [
  { key: "totalPointsWon", labelKey: "statTotalPoints" },
  { key: "ACE", labelKey: "statAces" },
  { key: "DOUBLE_FAULT", labelKey: "statDoubleFaults" },
  { key: "FOREHAND_ERROR", labelKey: "statForehandErrors" },
  { key: "BACKHAND_ERROR", labelKey: "statBackhandErrors" },
  { key: "VOLLEY_ERROR", labelKey: "statVolleyErrors" },
  { key: "OUT_OF_BOUNDS", labelKey: "statOutOfBounds" },
  { key: "NET_ERROR", labelKey: "statNetErrors" },
  { key: "WINNER", labelKey: "statWinners" },
  { key: "unannotated", labelKey: "statUnannotated" },
];

function PlayerStatsCard({ name, stats }: { name: string; stats: PlayerStats | undefined }) {
  const { t } = useTranslation();
  const s = stats ?? {
    aces: 0, doubleFaults: 0, forehandWinners: 0, backhandWinners: 0,
    forehandErrors: 0, backhandErrors: 0, volleyErrors: 0, outOfBounds: 0,
    netErrors: 0, winners: 0, totalWinners: 0, totalErrors: 0, winnerErrorRatio: 0,
  };
  const ratioDisplay = s.winnerErrorRatio === Infinity ? "∞" : s.winnerErrorRatio.toFixed(2);
  const ratioColor =
    s.totalWinners === 0 && s.totalErrors === 0
      ? "text-gray-400"
      : s.winnerErrorRatio >= 1 ? "text-green-400" : "text-red-400";

  return (
    <div className="bg-gray-800/40 rounded-md px-2.5 py-2 mb-1.5">
      <div className="font-semibold text-xs text-gray-200 mb-1.5">{name}</div>
      <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
        <div>
          <div className="text-green-400 font-bold text-sm">{s.aces}</div>
          <div className="text-gray-500">{t("statAces")}</div>
        </div>
        <div>
          <div className="text-green-400 font-bold text-sm">{s.totalWinners}</div>
          <div className="text-gray-500">{t("totalWinners")}</div>
        </div>
        <div>
          <div className="text-red-400 font-bold text-sm">{s.totalErrors}</div>
          <div className="text-gray-500">{t("totalErrors")}</div>
        </div>
      </div>
      <div className="flex justify-between mt-1 pt-1 border-t border-gray-700/30 text-[10px] text-gray-500">
        <span>{t("fhWinners")}: {s.forehandWinners} | {t("bhWinners")}: {s.backhandWinners}</span>
      </div>
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>{t("fhErrors")}: {s.forehandErrors} | {t("bhErrors")}: {s.backhandErrors}</span>
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">
        {t("winnerErrorRatio")}: <span className={`font-bold ${ratioColor}`}>{ratioDisplay}</span>
      </div>
    </div>
  );
}

function StatsDetail({ stats, teamAName, teamBName, teams, playerStats }: StatsDetailProps) {
  const { t } = useTranslation();
  const hasPlayerStats = teams && playerStats && Object.keys(playerStats).length > 0;

  return (
    <div className="bg-gray-800/60 rounded-b-lg px-3 py-2 mt-px border-x border-b border-gray-700/30">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-700/50">
            <th className="text-left py-1.5 font-medium">&nbsp;</th>
            <th className="text-center py-1.5 font-medium">{teamAName}</th>
            <th className="text-center py-1.5 font-medium">{teamBName}</th>
          </tr>
        </thead>
        <tbody>
          {STAT_LABELS.map(({ key, labelKey }, i) => (
            <tr
              key={key}
              className={`border-b border-gray-800/50 ${
                i % 2 === 0 ? "bg-gray-800/30" : ""
              }`}
            >
              <td className="py-1.5 text-gray-400">{t(labelKey)}</td>
              <td className="text-center font-mono tabular-nums">{stats.A[key]}</td>
              <td className="text-center font-mono tabular-nums">{stats.B[key]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasPlayerStats && (
        <div className="mt-3 pt-2 border-t border-gray-700/30">
          <div className="text-xs font-semibold text-gray-400 text-center mb-2">{t("playerStats")}</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              {teams.A.players.map((p) => (
                <PlayerStatsCard key={p.playerId} name={p.displayName} stats={playerStats[p.playerId]} />
              ))}
            </div>
            <div>
              {teams.B.players.map((p) => (
                <PlayerStatsCard key={p.playerId} name={p.displayName} stats={playerStats[p.playerId]} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
