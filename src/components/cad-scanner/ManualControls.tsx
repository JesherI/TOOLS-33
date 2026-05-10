import { SelectionRect } from "./types";

interface ManualControlsProps {
  selections: SelectionRect[];
  onRemoveSelection: (id: string) => void;
  onClearAll: () => void;
}

export function ManualControls({ selections, onRemoveSelection, onClearAll }: ManualControlsProps) {
  if (selections.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Selecciones</label>
        <div className="text-gray-500 text-xs py-4 text-center border border-dashed border-white/10 rounded-xl">
          Haz clic y arrastra en el canvas para seleccionar áreas
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          Selecciones ({selections.length})
        </label>
        <button
          onClick={onClearAll}
          className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
        >
          Limpiar
        </button>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {selections.map((sel, i) => {
          const w = Math.abs(sel.x2 - sel.x1).toFixed(1);
          const h = Math.abs(sel.y2 - sel.y1).toFixed(1);
          return (
            <div
              key={sel.id}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl"
            >
              <span className="text-orange-400 text-xs font-medium w-5">{i + 1}</span>
              <span className="text-gray-300 text-xs flex-1">{w}×{h} u</span>
              <button
                onClick={() => onRemoveSelection(sel.id)}
                className="text-gray-500 hover:text-red-400 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
