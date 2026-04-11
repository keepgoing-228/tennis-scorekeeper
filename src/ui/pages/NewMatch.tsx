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

  // Determine team players from picker or manual input
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
  const canStart = teamAPlayers.length >= maxPerTeam && teamBPlayers.length >= maxPerTeam;

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
          onEmpty={() => setShowManualInput(true)}
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
