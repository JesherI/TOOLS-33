import { useState, useCallback } from "react";

interface EmptyStateProps {
  onSelectFolder: () => void;
  hasBackCover: boolean;
  onBackCoverChange: (enabled: boolean) => void;
}

export function EmptyState({ onSelectFolder, hasBackCover, onBackCoverChange }: EmptyStateProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Note: Actual folder drop would require different handling
    // For now, clicking opens the folder dialog
  }, []);

  return (
    <div className="space-y-6">
      {/* Main Drop Zone - Minimalist Design */}
      <div
        onClick={onSelectFolder}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer
          transition-all duration-300 backdrop-blur-sm
          ${
            isDragging
              ? "border-orange-500 bg-orange-500/10 scale-[1.02]"
              : "border-orange-500/30 bg-black/40 hover:border-orange-500/60 hover:bg-orange-500/5"
          }
        `}
      >
        {/* Upload Icon */}
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
        <p className="text-gray-400">
          o haz clic para seleccionar archivos
        </p>
      </div>

      {/* Back Cover Toggle - Below the drop zone */}
      <div className="flex justify-center">
        <label className="flex items-center gap-3 px-6 py-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:bg-white/[0.07] transition-colors">
          <div className="relative">
            <input
              type="checkbox"
              checked={hasBackCover}
              onChange={(e) => onBackCoverChange(e.target.checked)}
              className="peer sr-only"
            />
            <div className={`
              w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
              ${hasBackCover 
                ? "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-500 shadow-lg shadow-orange-500/25" 
                : "bg-black/40 border-white/20"
              }
            `}>
              {hasBackCover && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span className="text-sm font-medium text-white">Tiene contraportada</span>
          </div>
        </label>
      </div>
    </div>
  );
}
