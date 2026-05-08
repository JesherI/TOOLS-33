interface GeneratePdfButtonProps {
  isProcessing: boolean;
  progress: number;
  onClick: () => void;
}

export function GeneratePdfButton({ isProcessing, progress, onClick }: GeneratePdfButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isProcessing}
      className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-black font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed"
    >
      {isProcessing ? (
        <>
          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          <span>Procesando... {Math.round(progress)}%</span>
        </>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Generar PDF
        </>
      )}
    </button>
  );
}
