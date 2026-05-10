import { EditableValue } from "./EditableValue";
import type { TextureImage } from "./types";

interface BottomControlsProps {
  image: TextureImage | null;
  onUpdate: (id: string, config: Partial<TextureImage["config"]>) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function BottomControls({ image, onUpdate, zoom, onZoomChange }: BottomControlsProps) {
  const adjustZoom = (delta: number) => {
    const newZoom = Math.round((zoom + delta) * 100) / 100;
    onZoomChange(Math.max(0.2, Math.min(1.5, newZoom)));
  };

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-black/60 backdrop-blur-md border-t border-white/10">
      {image && (
        <>
          {/* Escala */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Escala</span>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.05"
              value={image.config.scale}
              onChange={(e) => onUpdate(image.id, { scale: parseFloat(e.target.value) })}
              className="w-24 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <EditableValue
              value={Math.round(image.config.scale * 100)}
              suffix="%"
              min={10}
              max={300}
              onChange={(val) => onUpdate(image.id, { scale: val / 100 })}
              className="w-9"
            />
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Rotación */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Rotar</span>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={image.config.rotation}
              onChange={(e) => onUpdate(image.id, { rotation: parseInt(e.target.value) })}
              className="w-24 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <EditableValue
              value={image.config.rotation}
              suffix="°"
              min={0}
              max={360}
              step={5}
              onChange={(val) => onUpdate(image.id, { rotation: val })}
              className="w-7"
            />
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Opacidad */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Opac</span>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={image.config.opacity}
              onChange={(e) => onUpdate(image.id, { opacity: parseInt(e.target.value) })}
              className="w-24 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <EditableValue
              value={image.config.opacity}
              suffix="%"
              min={10}
              max={100}
              step={5}
              onChange={(val) => onUpdate(image.id, { opacity: val })}
              className="w-7"
            />
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Voltear */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={image.config.flipAlternate}
                onChange={(e) => onUpdate(image.id, { flipAlternate: e.target.checked })}
                className="peer sr-only"
              />
              <div className={`
                w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
                ${image.config.flipAlternate 
                  ? "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-500 shadow-lg shadow-orange-500/25" 
                  : "bg-black/40 border-white/20"
                }
              `}>
                {image.config.flipAlternate && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-300">Voltear</span>
          </label>

          <div className="flex-1" />
        </>
      )}

      {!image && <div className="flex-1" />}

      {/* Zoom con botones +/- */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => adjustZoom(-0.05)}
          className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-white text-xs transition-all"
        >
          −
        </button>
        <span className="text-xs text-gray-400 w-8 text-center">{(zoom * 100).toFixed(0)}%</span>
        <button
          onClick={() => adjustZoom(0.05)}
          className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-white text-xs transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}
