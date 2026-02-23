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
    <div className="bg-gray-800/80 backdrop-blur-sm px-3 py-2.5 flex flex-wrap justify-center gap-2">
      {REASONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className="px-3 py-1.5 text-xs font-medium rounded-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 transition-colors duration-150"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
