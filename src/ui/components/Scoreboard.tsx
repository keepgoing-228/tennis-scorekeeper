import { useTranslation } from "react-i18next";
import type { MatchState } from "../../domain/types.ts";

type Props = {
  state: MatchState;
  swapped?: boolean;
};

export default function Scoreboard({ state, swapped = false }: Props) {
  const { t } = useTranslation();
  const teamAName = state.teams.A.players.map((p) => p.displayName).join(" / ");
  const teamBName = state.teams.B.players.map((p) => p.displayName).join(" / ");
  const leftName = swapped ? teamBName : teamAName;
  const rightName = swapped ? teamAName : teamBName;
  const leftServer = swapped ? "B" : "A";
  const rightServer = swapped ? "A" : "B";

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm px-4 py-3 space-y-1.5">
      <div className="text-sm text-yellow-400 font-semibold text-center tracking-wide">
        {state.ruleset.bestOf === "practice"
          ? (state.ruleset.practiceMode === "first_to_3" ? t('firstTo3Games') : t('practiceTiebreak'))
          : null}
      </div>
      <div className="flex justify-center gap-5 text-sm text-gray-400 font-mono">
        {state.sets.map((set, i) => {
          const left = swapped ? set.gamesB : set.gamesA;
          const right = swapped ? set.gamesA : set.gamesB;
          return (
            <span
              key={i}
              className={
                i === state.currentSetIndex
                  ? "text-white font-bold"
                  : ""
              }
            >
              {left}-{right}
            </span>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-base font-semibold px-2">
        <div className="flex items-center gap-2">
          {state.server === leftServer && (
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          )}
          <span className="text-gray-200">{leftName}</span>
        </div>
        <span className="text-xs text-gray-500 uppercase tracking-wider">{t('vs')}</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-200">{rightName}</span>
          {state.server === rightServer && (
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
          )}
        </div>
      </div>

      {state.sets[state.currentSetIndex].game.kind === "tiebreak" &&
        state.ruleset.bestOf !== "practice" && (
          <div className="text-xs text-yellow-400 text-center font-semibold tracking-widest">
            {t('tiebreakIndicator')}
          </div>
        )}
    </div>
  );
}
