import { formatFileSize } from "../../utils";

export interface FileItemData {
  id: string;
  name: string;
  size: number;
  status: "pending" | "compressing" | "done" | "error";
  progress?: number;
  compressedSize?: number;
  compressionRatio?: string;
  errorMessage?: string;
}

interface FileItemProps {
  file: FileItemData;
  isCompressing: boolean;
  onRemove: (id: string) => void;
}

export function FileItem({ file, isCompressing, onRemove }: FileItemProps) {
  const getStatusColor = () => {
    switch (file.status) {
      case "done": return "#22c55e";
      case "error": return "#ef4444";
      case "compressing": return "#f97316";
      default: return "#f97316";
    }
  };

  const getBgClass = () => {
    switch (file.status) {
      case "done": return "bg-green-500/10 border-green-500/30";
      case "error": return "bg-red-500/10 border-red-500/30";
      case "compressing": return "bg-orange-500/10 border-orange-500/30";
      default: return "bg-white/5 border-white/5";
    }
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${getBgClass()}`}>
      <div className="flex items-center gap-3 flex-1">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={getStatusColor()}
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-gray-200 font-medium">
            {file.name}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">
              {formatFileSize(file.size)}
            </p>
            {file.status === "done" && file.compressedSize && (
              <>
                <span className="text-xs text-green-400">→</span>
                <p className="text-xs text-green-400">
                  {formatFileSize(file.compressedSize)} 
                  ({file.compressionRatio} menos)
                </p>
              </>
            )}
            {file.status === "error" && (
              <p className="text-xs text-red-400" title={file.errorMessage}>
                {file.errorMessage && file.errorMessage.length > 40 
                  ? file.errorMessage.substring(0, 40) + "..." 
                  : file.errorMessage}
              </p>
            )}
          </div>
          {/* Progress bar */}
          {file.status === "compressing" && (
            <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-200"
                style={{ width: `${file.progress || 0}%` }}
              />
            </div>
          )}
        </div>
      </div>
      {!isCompressing && (
        <button
          onClick={() => onRemove(file.id)}
          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
