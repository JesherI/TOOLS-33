interface PdfMergeAddCardProps {
  onClick: () => void;
}

export function PdfMergeAddCard({ onClick }: PdfMergeAddCardProps) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-dashed border-white/20 hover:border-orange-500/50 bg-white/5 hover:bg-orange-500/10 transition-all duration-200 flex items-center justify-center gap-2 px-4 py-3"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-gray-400 group-hover:text-orange-400 transition-colors duration-200"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <span className="text-sm text-gray-500 group-hover:text-orange-400/80 transition-colors duration-200">
        Agregar más archivos
      </span>
    </div>
  );
}
