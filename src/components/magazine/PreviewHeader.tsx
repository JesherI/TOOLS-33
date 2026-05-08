interface PreviewHeaderProps {
  total: number;
  spreadsCount: number;
  hasBackCover: boolean;
  onBack: () => void;
}

export function PreviewHeader({ total, spreadsCount, hasBackCover, onBack }: PreviewHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <div>
          <h2 className="text-xl font-bold text-orange-500">Orden de impresión</h2>
          <p className="text-xs text-gray-400">
            {total} páginas • {spreadsCount} spreads • {hasBackCover ? "Con contraportada" : "Sin contraportada"}
          </p>
        </div>
      </div>
    </div>
  );
}
