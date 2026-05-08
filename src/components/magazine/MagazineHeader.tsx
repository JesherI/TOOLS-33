

interface MagazineHeaderProps {
  onSelectFolder: () => void;
  isLoading: boolean;
  hasPages: boolean;
}

export function MagazineHeader({ onSelectFolder, isLoading, hasPages }: MagazineHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500/30 to-orange-600/10 rounded-xl flex items-center justify-center border border-orange-500/50 shadow-lg shadow-orange-500/30">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Magazine Builder</h1>
          <p className="text-xs text-gray-400">Imposición de revistas - Tamaño Carta</p>
        </div>
      </div>
      
      {/* Botón cambiar carpeta */}
      <button
        onClick={onSelectFolder}
        disabled={isLoading}
        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        {hasPages ? "Cambiar carpeta" : "Seleccionar carpeta"}
      </button>
    </div>
  );
}
