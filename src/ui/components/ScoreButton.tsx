import type { SetState, TeamSide } from "../../domain/types.ts";

function getDisplayScore(game: SetState["game"], side: TeamSide): string {
  if (game.kind === "tiebreak") {
    return String(side === "A" ? game.tbA : game.tbB);
  }
  const points = side === "A" ? game.pointsA : game.pointsB;
  return points === "AD" ? "AD" : String(points);
}

type Props = {
  teamName: string;
  side: TeamSide;
  game: SetState["game"];
  disabled: boolean;
  onScore: () => void;
};

export default function ScoreButton({ teamName, side, game, disabled, onScore }: Props) {
  const score = getDisplayScore(game, side);

  return (
    <button
      onClick={onScore}
      disabled={disabled}
      className={`flex-1 flex flex-col items-center justify-center gap-4 text-white transition-colors ${
        side === "A"
          ? "bg-blue-700 hover:bg-blue-600 active:bg-blue-500"
          : "bg-red-700 hover:bg-red-600 active:bg-red-500"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="text-xl font-bold">{teamName}</span>
      <span className="text-7xl font-mono font-bold">{score}</span>
    </button>
  );
}
