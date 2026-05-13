import { SelectionRect, PaperSizeDef } from "./types";

interface ManualControlsProps {
  selections: SelectionRect[];
  onClearAll: () => void;
  paperSize: PaperSizeDef;
  derivedScale: number;
}

export function ManualControls({ selections, onClearAll, paperSize, derivedScale }: ManualControlsProps) {
  if (selections.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Área de papel</label>
        <div className="text-gray-500 text-xs py-4 text-center border border-dashed border-white/10 rounded-xl">
          Haz clic y arrastra en el canvas para definir<br />el área que ocupará el papel
        </div>
      </div>
    );
  }

  const sel = selections[0];
  const cadW = Math.abs(sel.x2 - sel.x1).toFixed(1);
  const cadH = Math.abs(sel.y2 - sel.y1).toFixed(1);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          Área de papel
        </label>
        <button
          onClick={onClearAll}
          className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
        >
          Quitar
        </button>
      </div>
      <div className="px-3 py-2 bg-white/5 border border-orange-500/30 rounded-xl space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Papel:</span>
          <span className="text-gray-200">{paperSize.name}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Tamaño:</span>
          <span className="text-gray-200">{paperSize.width_cm}×{paperSize.height_cm} cm</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">En CAD:</span>
          <span className="text-gray-200">{cadW}×{cadH} u</span>
        </div>
        {derivedScale > 0 && (
          <div className="flex justify-between text-xs pt-1 border-t border-white/10 mt-1">
            <span className="text-orange-400 font-medium">Escala:</span>
            <span className="text-orange-400 font-semibold">1:{derivedScale}</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-500 text-center">
        Click dentro del rectángulo para moverlo
      </p>
    </div>
  );
}