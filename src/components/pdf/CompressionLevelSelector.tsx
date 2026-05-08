import { CompressionLevel } from "../../utils";

interface CompressionLevelSelectorProps {
  level: CompressionLevel;
  onChange: (level: CompressionLevel) => void;
  disabled?: boolean;
}

const levels: { value: CompressionLevel; label: string; color: string }[] = [
  { value: "light", label: "Ligera", color: "bg-green-500" },
  { value: "medium", label: "Media", color: "bg-yellow-500" },
  { value: "high", label: "Alta", color: "bg-red-500" },
];

const descriptions: Record<CompressionLevel, string> = {
  light: "Elimina metadatos y optimiza estructura. Sin pérdida de calidad.",
  medium: "Compresión de imágenes al 65%. Balance calidad/tamaño.",
  high: "Compresión máxima al 45%. Reducción significativa.",
};

export function CompressionLevelSelector({ 
  level, 
  onChange, 
  disabled 
}: CompressionLevelSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-3">
        Nivel de compresión
      </label>
      
      <div className="grid grid-cols-3 gap-3">
        {levels.map((l) => (
          <button
            key={l.value}
            onClick={() => onChange(l.value)}
            disabled={disabled}
            className={`
              p-4 rounded-xl border text-left transition-all duration-200
              ${
                level === l.value
                  ? "border-orange-500 bg-orange-500/20"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full ${l.color}`} />
              <span
                className={`font-semibold ${
                  level === l.value ? "text-orange-400" : "text-gray-300"
                }`}
              >
                {l.label}
              </span>
            </div>
          </button>
        ))}
      </div>
      
      <p className="mt-3 text-sm text-gray-400">
        {descriptions[level]}
      </p>
    </div>
  );
}

export { type CompressionLevel } from "../../utils";
