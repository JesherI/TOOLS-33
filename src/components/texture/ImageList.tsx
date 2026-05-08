import { motion } from "framer-motion";
import type { TextureImage } from "./types";

interface ImageListProps {
  images: TextureImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ImageList({ images, selectedId, onSelect, onRemove }: ImageListProps) {
  return (
    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
      {images.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm">No hay imágenes</p>
        </div>
      ) : (
        images.map((img) => (
          <motion.div
            key={img.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`group relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
              selectedId === img.id
                ? "bg-orange-500/20 border border-orange-500"
                : "bg-white/5 border border-white/10 hover:border-white/20"
            }`}
            onClick={() => onSelect(img.id)}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs truncate">{img.name}</p>
              <p className="text-gray-500 text-[10px]">
                {(img.config.scale * 100).toFixed(0)}%
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(img.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        ))
      )}
    </div>
  );
}
