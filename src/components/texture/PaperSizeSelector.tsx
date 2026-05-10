import { motion } from "framer-motion";
import type { PaperSize } from "./types";
import { PAPER_SIZES } from "./types";

interface PaperSizeSelectorProps {
  selected: PaperSize;
  customWidth: number;
  customHeight: number;
  onSelect: (size: PaperSize) => void;
  onCustomWidthChange: (width: number) => void;
  onCustomHeightChange: (height: number) => void;
}

export function PaperSizeSelector({
  selected,
  customWidth,
  customHeight,
  onSelect,
  onCustomWidthChange,
  onCustomHeightChange,
}: PaperSizeSelectorProps) {
  return (
    <>
      <style>{`
        .custom-size-input::-webkit-inner-spin-button,
        .custom-size-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .custom-size-input {
          -moz-appearance: textfield;
        }
      `}</style>
    <div className="flex items-center gap-2">
      {["letter", "legal", "tabloid"].map((key) => (
        <button
          key={key}
          onClick={() => onSelect(key as PaperSize)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selected === key
              ? "bg-orange-500 text-white"
              : "bg-white/10 text-gray-300 hover:bg-white/20"
          }`}
        >
          {PAPER_SIZES[key as PaperSize].name}
        </button>
      ))}
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSelect("custom")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            selected === "custom"
              ? "bg-orange-500 text-white"
              : "bg-white/10 text-gray-300 hover:bg-white/20"
          }`}
        >
          Pers.
        </button>
        
        {selected === "custom" && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            className="flex items-center gap-1"
          >
            <input
              type="number"
              min="1"
              max="100"
              step="0.1"
              value={customWidth}
              onChange={(e) => onCustomWidthChange(parseFloat(e.target.value) || 1)}
              className="custom-size-input w-14 bg-transparent border-b border-orange-500/50 text-orange-400 text-xs focus:border-orange-500 focus:outline-none text-center"
            />
            <span className="text-gray-500 text-xs">×</span>
            <input
              type="number"
              min="1"
              max="100"
              step="0.1"
              value={customHeight}
              onChange={(e) => onCustomHeightChange(parseFloat(e.target.value) || 1)}
              className="custom-size-input w-14 bg-transparent border-b border-orange-500/50 text-orange-400 text-xs focus:border-orange-500 focus:outline-none text-center"
            />
            <span className="text-gray-500 text-xs">cm</span>
          </motion.div>
        )}
      </div>
    </div>
    </>
  );
}
