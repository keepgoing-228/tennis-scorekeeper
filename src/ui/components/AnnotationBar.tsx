import type { PointLossReason } from "../../domain/types.ts";

const REASONS: { value: PointLossReason; label: string }[] = [
  { value: "DOUBLE_FAULT", label: "Double Fault" },
  { value: "ACE", label: "Ace" },
  { value: "FOREHAND_ERROR", label: "FH Error" },
  { value: "BACKHAND_ERROR", label: "BH Error" },
  { value: "VOLLEY_ERROR", label: "Volley" },
  { value: "OUT_OF_BOUNDS", label: "Out" },
  { value: "NET_ERROR", label: "Net" },
  { value: "WINNER", label: "Winner" },
];

type Props = {
  onSelect: (reason: PointLossReason) => void;
};

export default function AnnotationBar({ onSelect }: Props) {
  return (
    <div className="bg-gray-800 px-2 py-2 flex flex-wrap justify-center gap-1.5">
      {REASONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-600 hover:bg-gray-500 active:bg-gray-400 text-white transition-colors"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
