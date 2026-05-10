import { useState } from "react";
import { PAPER_SIZES, PaperSizeDef } from "./types";

interface PaperSizeSelectorProps {
  size: PaperSizeDef;
  onSizeChange: (size: PaperSizeDef) => void;
}

export function PaperSizeSelector({ size, onSizeChange }: PaperSizeSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customW, setCustomW] = useState("60");
  const [customH, setCustomH] = useState("45");
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSelect = (ps: PaperSizeDef) => {
    setIsCustom(false);
    onSizeChange(ps);
    setShowDropdown(false);
  };

  const handleCustom = () => {
    setIsCustom(true);
    setShowDropdown(false);
    const w = parseFloat(customW);
    const h = parseFloat(customH);
    if (w > 0 && h > 0) {
      onSizeChange({ name: `${w}x${h} cm`, width_cm: w, height_cm: h });
    }
  };

  const handleCustomW = (v: string) => {
    setCustomW(v);
    const w = parseFloat(v);
    const h = parseFloat(customH);
    if (w > 0 && h > 0) {
      onSizeChange({ name: `${w}x${h} cm`, width_cm: w, height_cm: h });
    }
  };

  const handleCustomH = (v: string) => {
    setCustomH(v);
    const w = parseFloat(customW);
    const h = parseFloat(v);
    if (w > 0 && h > 0) {
      onSizeChange({ name: `${w}x${h} cm`, width_cm: w, height_cm: h });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Tamaño Papel</label>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs
            flex items-center justify-between hover:border-white/30 transition-all"
        >
          <span>{isCustom ? `${customW}×${customH} cm` : `${size.name} (${size.width_cm}×${size.height_cm} cm)`}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" className={`transition-transform ${showDropdown ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-zinc-900 border border-white/10
            rounded-xl overflow-hidden z-50 shadow-xl shadow-black/50">
            {PAPER_SIZES.map((ps) => (
              <button
                key={ps.name}
                onClick={() => handleSelect(ps)}
                className={`w-full px-3 py-2 text-xs text-left hover:bg-white/5 transition-all ${
                  !isCustom && size.name === ps.name ? "text-orange-400" : "text-gray-300"
                }`}
              >
                <span className="font-medium">{ps.name}</span>
                <span className="text-gray-500 ml-2">{ps.width_cm}×{ps.height_cm} cm</span>
              </button>
            ))}
            <div className="border-t border-white/10 p-2">
              <button
                onClick={handleCustom}
                className={`w-full px-3 py-1.5 rounded-lg text-xs transition-all ${
                  isCustom ? "bg-orange-500/20 text-orange-400" : "text-gray-300 hover:bg-white/5"
                }`}
              >
                Personalizado
              </button>
              {isCustom && (
                <div className="flex gap-2 mt-1">
                  <input type="number" value={customW} onChange={(e) => handleCustomW(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-black/40 border border-white/10 text-white text-xs text-center" />
                  <span className="text-gray-400 self-center">×</span>
                  <input type="number" value={customH} onChange={(e) => handleCustomH(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-black/40 border border-white/10 text-white text-xs text-center" />
                  <span className="text-gray-400 self-center text-xs">cm</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
