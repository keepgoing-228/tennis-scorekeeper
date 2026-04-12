import { useTranslation } from "react-i18next";
import type { Player, PointLossReason } from "../../domain/types.ts";

const WINNER_ANNOTATIONS: Set<PointLossReason> = new Set(["ACE", "WINNER"]);

type Props = {
  players: Player[];
  annotation: PointLossReason;
  onSelect: (playerId: string) => void;
  onSkip: () => void;
};

export default function PlayerAttributionPopup({
  players,
  annotation,
  onSelect,
  onSkip,
}: Props) {
  const { t } = useTranslation();
  const isWinner = WINNER_ANNOTATIONS.has(annotation);
  const prompt = isWinner ? t("whoHitIt") : t("whoMadeError");

  // Map annotation to its i18n label key
  const annotationLabels: Record<string, string> = {
    ACE: "ace",
    WINNER: "winner",
    DOUBLE_FAULT: "doubleFault",
    FOREHAND_ERROR: "fhError",
    BACKHAND_ERROR: "bhError",
    VOLLEY_ERROR: "volleyError",
    OUT_OF_BOUNDS: "outError",
    NET_ERROR: "netError",
  };
  const annotationLabel = t(annotationLabels[annotation] ?? annotation);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onSkip}
    >
      <div
        className="bg-gray-800 rounded-xl p-6 mx-4 max-w-sm w-full border border-gray-600"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`text-center text-sm font-bold mb-1 ${
            isWinner ? "text-green-400" : "text-red-400"
          }`}
        >
          {annotationLabel.toUpperCase()}
        </div>
        <div className="text-center text-gray-300 mb-5">{prompt}</div>

        <div className="flex gap-3">
          {players.map((player) => (
            <button
              key={player.playerId}
              onClick={() => onSelect(player.playerId)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-lg py-5 text-center transition-colors duration-150"
            >
              <div className="text-lg font-bold text-white">
                {player.displayName}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onSkip}
          className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-400 transition-colors duration-150"
        >
          {t("skipAttribution")}
        </button>
      </div>
    </div>
  );
}
