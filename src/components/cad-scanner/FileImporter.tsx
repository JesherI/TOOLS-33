import { useCallback, useRef } from "react";

interface FileImporterProps {
  onFilesSelected: (files: FileList) => void;
  isLoading: boolean;
}

export function FileImporter({ onFilesSelected, isLoading }: FileImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  }, [onFilesSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  }, [onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      onClick={isLoading ? undefined : handleClick}
      onDrop={isLoading ? undefined : handleDrop}
      onDragOver={isLoading ? undefined : handleDragOver}
      className="w-full py-10 px-8 border-2 border-dashed border-white/20 rounded-2xl
        hover:border-orange-500/50 hover:bg-orange-500/5 cursor-pointer
        transition-all duration-300 flex flex-col items-center justify-center gap-4"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".dxf,.dwg"
        onChange={handleChange}
        className="hidden"
        multiple={false}
      />
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5" className="text-orange-500">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="M9 15l3-3 3 3" />
      </svg>
      <div className="text-center">
        <p className="text-white font-medium text-lg">Importar archivo CAD</p>
        <p className="text-gray-400 text-sm mt-1">Arrastra o selecciona un archivo DXF/DWG</p>
      </div>
    </div>
  );
}
