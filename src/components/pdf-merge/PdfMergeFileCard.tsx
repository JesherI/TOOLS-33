import { memo } from "react";

interface PdfMergeFileCardProps {
  name: string;
  size: number;
  pageCount?: number;
  isSelected?: boolean;
  index: number;
  totalCount: number;
  onSelect?: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export const PdfMergeFileCard = memo(({
  name,
  size,
  pageCount,
  isSelected,
  index,
  totalCount,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PdfMergeFileCardProps) => {
  return (
    <div
      onClick={onSelect}
      className={`
        group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 select-none
        ${isSelected
          ? "border-orange-500/50 bg-orange-500/10"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
        }
      `}
    >
      {/* Order Number */}
      <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-orange-400">{index + 1}</span>
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? "text-orange-400" : "text-gray-200"}`} title={name}>
          {name}
        </p>
        <p className="text-[11px] text-gray-500">
          {formatFileSize(size)}
          {pageCount ? ` • ${pageCount} pág${pageCount > 1 ? "s" : ""}` : ""}
        </p>
      </div>

      {/* Reorder Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp?.();
          }}
          disabled={index === 0}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-orange-500/20 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all"
          title="Mover arriba"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown?.();
          }}
          disabled={index === totalCount - 1}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-orange-500/20 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all"
          title="Mover abajo"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Remove Button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0"
          title="Eliminar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 hover:text-red-400">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
});

PdfMergeFileCard.displayName = "PdfMergeFileCard";
