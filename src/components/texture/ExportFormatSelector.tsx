import { useState } from "react";
import { motion } from "framer-motion";

interface ExportFormatSelectorProps { 
  value: "pdf" | "pptx"; 
  onChange: (format: "pdf" | "pptx") => void;
}

export function ExportFormatSelector({ value, onChange }: ExportFormatSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs text-white transition-all"
      >
        {value === "pdf" ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e95420" strokeWidth="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
        )}
        <span className="uppercase">{value}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 top-full mt-1 w-32 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <button
              onClick={() => { onChange("pdf"); setIsOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-all ${
                value === "pdf" ? "bg-orange-500/20 text-orange-400" : "text-white hover:bg-white/10"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              PDF
            </button>
            <button
              onClick={() => { onChange("pptx"); setIsOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-all ${
                value === "pptx" ? "bg-orange-500/20 text-orange-400" : "text-white hover:bg-white/10"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e95420" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
              PPTX
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
}
