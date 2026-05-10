interface BackCoverToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function BackCoverToggle({ enabled, onChange }: BackCoverToggleProps) {
  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="relative mt-1">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <div className={`
            w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
            ${enabled 
              ? "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-500 shadow-lg shadow-orange-500/25" 
              : "bg-black/40 border-white/20"
            }
          `}>
            {enabled && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
        <div>
          <span className="block text-sm font-semibold text-white">Tiene contraportada</span>
          <span className="block text-xs text-gray-500 mt-1">
            La última imagen va en la última posición (90).
            Las blancas se distribuyen según las reglas de resvista:
            2 blancas = pos 2 y 89, 3 blancas = pos 2, 88 y 89.
          </span>
        </div>
      </label>
    </div>
  );
}
