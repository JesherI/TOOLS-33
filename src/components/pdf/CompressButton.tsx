interface CompressButtonProps {
  isCompressing: boolean;
  fileCount: number;
  onClick: () => void;
}

export function CompressButton({ isCompressing, fileCount, onClick }: CompressButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isCompressing}
      className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-black font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
    >
      {isCompressing ? (
        <>
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Comprimiendo con Ghostscript...
        </>
      ) : (
        <>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 14v-4" />
            <path d="M12 14v-4" />
            <path d="M16 14v-4" />
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
          Comprimir {fileCount} archivo{fileCount > 1 ? "s" : ""}
        </>
      )}
    </button>
  );
}
