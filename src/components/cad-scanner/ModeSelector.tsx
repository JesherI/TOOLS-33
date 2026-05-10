import { CadMode } from "./types";

interface ModeSelectorProps {
  mode: CadMode;
  onModeChange: (mode: CadMode) => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Modo</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onModeChange("auto")}
          className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
            mode === "auto"
              ? "bg-orange-500/20 border border-orange-500/40 text-orange-400"
              : "bg-white/5 border border-white/10 text-gray-300 hover:border-white/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Automático
          </div>
        </button>
        <button
          onClick={() => onModeChange("manual")}
          className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
            mode === "manual"
              ? "bg-orange-500/20 border border-orange-500/40 text-orange-400"
              : "bg-white/5 border border-white/10 text-gray-300 hover:border-white/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            Manual
          </div>
        </button>
      </div>
    </div>
  );
}
