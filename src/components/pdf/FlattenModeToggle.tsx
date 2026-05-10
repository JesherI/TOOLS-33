interface FlattenModeToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function FlattenModeToggle({ enabled, onChange, disabled }: FlattenModeToggleProps) {
  return (
    <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="relative mt-1">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="peer sr-only"
          />
          <div className={`
            w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
            ${enabled 
              ? "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-500 shadow-lg shadow-orange-500/25" 
              : "bg-black/40 border-white/20"
            }
            ${disabled ? "opacity-50" : ""}
          `}>
            {enabled && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
        <div>
          <span className="block text-sm font-semibold text-orange-400">
            Modo Flatten (Recomendado para CAD)
          </span>
          <span className="block text-xs text-orange-300/70 mt-1">
            Convierte el PDF a imagen plana (como Photoshop). 
            Elimina capas vectoriales y metadatos CAD. 
            La impresora procesa más rápido. 
            ⚠️ Líneas muy finas pueden perder algo de nitidez.
          </span>
        </div>
      </label>
    </div>
  );
}
