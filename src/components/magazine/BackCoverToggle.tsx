interface BackCoverToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function BackCoverToggle({ enabled, onChange }: BackCoverToggleProps) {
  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-orange-500/50 bg-black/40 text-orange-500 focus:ring-orange-500/50"
        />
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
