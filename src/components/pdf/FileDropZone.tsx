import { useRef } from "react";

interface FileDropZoneProps {
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  onFilesSelected: (files: FileList | null) => void;
  badge?: {
    text: string;
    color: "green" | "blue" | "orange";
  };
}

const colorClasses = {
  green: "bg-green-500/20 border-green-500/30 text-green-400",
  blue: "bg-blue-500/20 border-blue-500/30 text-blue-400",
  orange: "bg-orange-500/20 border-orange-500/30 text-orange-400",
};

export function FileDropZone({ 
  isDragging, 
  setIsDragging, 
  onFilesSelected,
  badge 
}: FileDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onFilesSelected(e.dataTransfer.files);
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer
        transition-all duration-300 backdrop-blur-sm
        ${
          isDragging
            ? "border-orange-500 bg-orange-500/10 scale-105"
            : "border-orange-500/30 bg-black/40 hover:border-orange-500/50 hover:bg-orange-500/5"
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf"
        onChange={(e) => onFilesSelected(e.target.files)}
        className="hidden"
      />

      {/* Badge */}
      {badge && (
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 border rounded-full text-xs font-mono ${colorClasses[badge.color]}`}>
            {badge.text}
          </span>
        </div>
      )}

      {/* Icon */}
      <div className="mb-6">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f97316"
          strokeWidth="1.5"
          className="mx-auto"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-orange-500 mb-3">
        Arrastra archivos aquí
      </h2>
      <p className="text-gray-400 mb-2">
        o haz clic para seleccionar archivos
      </p>
      <p className="text-sm text-gray-500">
        Compresión avanzada con Ghostscript
      </p>
    </div>
  );
}
