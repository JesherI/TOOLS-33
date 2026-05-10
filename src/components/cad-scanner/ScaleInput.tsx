import { useState } from "react";
import { SCALE_OPTIONS } from "./types";

interface ScaleInputProps {
  scale: number;
  onScaleChange: (scale: number) => void;
}

export function ScaleInput({ scale, onScaleChange }: ScaleInputProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("100");

  const handleSelect = (denominator: number) => {
    if (denominator === 0) {
      setIsCustom(true);
      const val = parseInt(customValue);
      if (val > 0) onScaleChange(val);
    } else {
      setIsCustom(false);
      onScaleChange(denominator);
    }
  };

  const handleCustomChange = (value: string) => {
    setCustomValue(value);
    const val = parseInt(value);
    if (val > 0) onScaleChange(val);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Escala</label>
      <div className="flex items-center gap-2">
        <div className="grid grid-cols-3 gap-1.5 flex-1">
          {SCALE_OPTIONS.map((opt) => (
            <button
              key={opt.denominator}
              onClick={() => handleSelect(opt.denominator)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                !isCustom && scale === opt.denominator
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                  : "bg-white/5 text-gray-300 border border-white/10 hover:border-white/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-gray-400 text-xs font-medium ml-1">1:</span>
        {isCustom && (
          <input
            type="number"
            min="1"
            max="100000"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="w-20 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs
              focus:outline-none focus:border-orange-500/50 text-center"
          />
        )}
      </div>
    </div>
  );
}
