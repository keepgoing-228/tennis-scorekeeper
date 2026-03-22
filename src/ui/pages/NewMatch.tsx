import { useState } from "react";
import { useNavigate, Link } from "react-router";
import type { BestOf, Ruleset, Team } from "../../domain/types.ts";
import { createMatch } from "../../storage/matchRepo.ts";
import { appendEvent } from "../../storage/eventRepo.ts";
import type { MatchCreatedEvent } from "../../domain/types.ts";
import { uuid } from "../../utils/uuid.ts";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher.tsx";

export default function NewMatch() {
  const navigate = useNavigate();
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [bestOf, setBestOf] = useState<BestOf>(3);
  const [tiebreak, setTiebreak] = useState<"none" | "7pt">("7pt");
  const [matchType, setMatchType] = useState<"singles" | "doubles">("singles");
  const [firstServer, setFirstServer] = useState<"A" | "B">("A");
  const [practiceMode, setPracticeMode] = useState<"tiebreak" | "first_to_3">("tiebreak");
  const { t } = useTranslation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const matchId = uuid();
    const ruleset: Ruleset = {
      bestOf,
      tiebreak,
      matchType,
      ...(bestOf === "practice" ? { practiceMode } : {}),
    };
    const teamA: Team = {
      teamId: "A",
      players: [{ playerId: uuid(), displayName: teamAName }],
    };
    const teamB: Team = {
      teamId: "B",
      players: [{ playerId: uuid(), displayName: teamBName }],
    };

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
          {t('appTitle')}
        </h1>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
              {t('teamA')}
            </label>
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              placeholder={t('teamA')}
              className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
              {t('teamB')}
            </label>
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              placeholder={t('teamB')}
              className="w-full bg-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 focus:outline-none transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            {t('bestOf')}
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
              {t('practice')}
            </button>
          </div>
        </div>

        {bestOf === "practice" && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              {t('practiceMode')}
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
                {t('tiebreak')}
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
                {t('firstTo3')}
              </button>
            </div>
          </div>
        )}

        {bestOf !== "practice" && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              {t('tiebreak')}
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
                  {tb === "none" ? t('tiebreakNone') : t('tiebreak7pt')}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            {t('matchType')}
          </label>
          <div className="flex">
            {(["singles", "doubles"] as const).map((mt, i) => (
              <button
                key={mt}
                type="button"
                onClick={() => setMatchType(mt)}
                className={`flex-1 py-2 font-semibold text-sm capitalize transition-colors duration-150 ${
                  i === 0 ? "rounded-l-lg border-r border-gray-700/50" : "rounded-r-lg"
                } ${
                  matchType === mt
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {mt === "singles" ? t('singles') : t('doubles')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
            {t('firstServer')}
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
                {s === "A" ? (teamAName || t('teamA')) : (teamBName || t('teamB'))}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-green-600 hover:bg-green-500 active:bg-green-400 rounded-lg font-bold text-lg transition-colors duration-150"
        >
          {t('startMatch')}
        </button>

        <Link
          to="/history"
          className="block text-center text-sm text-gray-500 hover:text-gray-400 transition-colors"
        >
          {t('matchHistory')}
        </Link>

        <LanguageSwitcher />
      </form>
    </div>
  );
}
