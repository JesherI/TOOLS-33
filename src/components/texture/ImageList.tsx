import type { TextureImage } from "./types";

interface ImageListProps {
  images: TextureImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ImageList({ images, selectedId, onSelect, onRemove }: ImageListProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1.5">
      {images.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">No hay imágenes</p>
        </div>
      ) : (
        images.map((img) => (
          <div
            key={img.id}
            className={`group relative flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors duration-150 ${
              selectedId === img.id
                ? "bg-orange-500 text-white"
                : "bg-white/10 hover:bg-white/20"
            }`}
            onClick={() => onSelect(img.id)}
          >
            <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0">
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs truncate ${selectedId === img.id ? "text-white" : "text-gray-300"}`}>
                {img.name}
              </p>
              <p className={`text-[10px] ${selectedId === img.id ? "text-white/70" : "text-gray-500"}`}>
                {(img.config.scale * 100).toFixed(0)}%
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(img.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/20 rounded-md transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={selectedId === img.id ? "#fff" : "#ef4444"} strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))
      )}
    </div>
  );
}
