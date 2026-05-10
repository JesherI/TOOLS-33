interface ExportButtonProps {
  onClick: () => void;
  disabled: boolean;
  isExporting: boolean;
  count: number;
}

export function ExportButton({ onClick, disabled, isExporting, count }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isExporting}
      className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
        disabled
          ? "bg-white/5 text-gray-500 cursor-not-allowed"
          : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/25"
      }`}
    >
      {isExporting ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar {count > 0 ? `${count} planos` : "PDF"}
        </>
      )}
    </button>
  );
}
