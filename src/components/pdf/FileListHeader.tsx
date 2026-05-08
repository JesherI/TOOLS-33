interface FileListHeaderProps {
  fileCount: number;
  isCompressing: boolean;
  onClear: () => void;
}

export function FileListHeader({ fileCount, isCompressing, onClear }: FileListHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-orange-500">
          Archivos ({fileCount})
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Compresión con Ghostscript
        </p>
      </div>
      {!isCompressing && (
        <button
          onClick={onClear}
          className="text-sm text-gray-400 hover:text-orange-400 transition-colors"
        >
          Limpiar todo
        </button>
      )}
    </div>
  );
}
