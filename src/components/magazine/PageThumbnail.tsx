import { memo } from "react";
import { useLazyImageLoad } from "../../hooks/useLazyImage";

export interface PageItem {
  id: number;
  imagePath: string | null;
  imageData: Uint8Array | null;
  name: string;
  isBlank: boolean;
  imgNum?: number;
  thumbnailUrl?: string | null;
}

interface PageThumbnailProps {
  page: PageItem;
}

export const PageThumbnail = memo(({ page }: PageThumbnailProps) => {
  const { imageUrl, isLoading, setRef } = useLazyImageLoad(page.imageData, {
    maxSize: 300,
    rootMargin: '200px',
    threshold: 0.1,
    enabled: !!page.imageData
  });

  return (
    <div
      ref={setRef}
      className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 ${
        page.isBlank 
          ? "border-dashed border-gray-600 bg-gray-800/50" 
          : page.imageData 
            ? "border-orange-500/50 hover:border-orange-400" 
            : "border-gray-600 hover:border-gray-500"
      }`}
      title={page.name}
    >
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
          <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={`Página ${page.id}`}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={`w-full h-full flex flex-col items-center justify-center ${
          page.isBlank ? "bg-gray-800/30" : "bg-gray-800/50"
        }`}>
          <span className={`text-xl font-bold ${page.isBlank ? "text-gray-500" : "text-gray-400"}`}>
            {page.id}
          </span>
        </div>
      )}

      {page.isBlank && (
        <div className="absolute top-2 left-2 right-2 py-1.5 bg-gray-700/90 rounded-lg text-center">
          <span className="text-xs font-bold text-gray-300 tracking-wider">BLANCO</span>
        </div>
      )}

      {!page.isBlank && page.imgNum && (
        <div className="absolute bottom-0 left-0 right-0 py-1.5 bg-black/80 text-center">
          <span className="text-xs font-bold text-orange-400">Img {page.imgNum}</span>
        </div>
      )}
    </div>
  );
});

PageThumbnail.displayName = "PageThumbnail";
