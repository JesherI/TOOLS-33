interface MergeButtonProps {
  onClick: () => void;
  disabled?: boolean;
  fileCount: number;
}

export function MergeButton({ onClick, disabled, fileCount }: MergeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2
        ${disabled 
          ? "bg-white/10 text-gray-500 cursor-not-allowed" 
          : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40"
        }
      `}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2" />
        <path d="M16 3h5v5M8 21H3v-5" />
        <path d="M21 3l-9 9M3 21l9-9" />
      </svg>
      <span>Unir {fileCount} PDF{fileCount !== 1 ? "s" : ""}</span>
    </button>
  );
}