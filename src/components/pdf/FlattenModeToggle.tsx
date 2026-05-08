interface FlattenModeToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function FlattenModeToggle({ enabled, onChange, disabled }: FlattenModeToggleProps) {
  return (
    <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-1 w-4 h-4 rounded border-purple-500/50 bg-black/40 text-purple-500 focus:ring-purple-500/50 disabled:opacity-50"
        />
        <div>
          <span className="block text-sm font-semibold text-purple-400">
            Modo Flatten (Recomendado para CAD)
          </span>
          <span className="block text-xs text-purple-300/70 mt-1">
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
