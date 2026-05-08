interface FlattenModeSelectorProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

const options = [
  { value: false, label: "Normal", description: "Mantiene capas y metadatos" },
  { value: true, label: "Flatten", description: "Convierte a imagen plana (CAD)" },
];

export function FlattenModeSelector({ enabled, onChange, disabled }: FlattenModeSelectorProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-400 mb-3">
        Modo de compresión
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={option.label}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`
              p-4 rounded-xl border text-left transition-all duration-200
              ${
                enabled === option.value
                  ? "border-orange-500 bg-orange-500/20"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-3 h-3 rounded-full ${
                option.value ? "bg-orange-500" : "bg-green-500"
              }`} />
              <span
                className={`font-semibold ${
                  enabled === option.value ? "text-orange-400" : "text-gray-300"
                }`}
              >
                {option.label}
              </span>
            </div>
            <p className={`text-xs mt-1 ${
              enabled === option.value ? "text-orange-300/70" : "text-gray-500"
            }`}>
              {option.description}
            </p>
          </button>
        ))}
      </div>
      
      {enabled && (
        <p className="mt-3 text-sm text-orange-300/70">
          ⚠️ Recomendado para CAD. Elimina capas vectoriales y metadatos. 
          La impresora procesa más rápido pero líneas finas pueden perder nitidez.
        </p>
      )}
    </div>
  );
}
