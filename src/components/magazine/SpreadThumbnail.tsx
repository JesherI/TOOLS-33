import { memo } from "react";
import { useLazyImageLoad } from "../../hooks/useLazyImage";
import type { PageItem } from "./PageThumbnail";

interface SpreadThumbnailProps {
  left: PageItem;
  right: PageItem;
  spreadNum: number;
}

export const SpreadThumbnail = memo(({ left, right, spreadNum }: SpreadThumbnailProps) => {
  const { imageUrl: leftUrl, isLoading: leftLoading, setRef: setLeftRef } = useLazyImageLoad(left.imageData, {
    maxSize: 200,
    rootMargin: '150px',
    enabled: !!left.imageData && !left.isBlank
  });
  
  const { imageUrl: rightUrl, isLoading: rightLoading, setRef: setRightRef } = useLazyImageLoad(right.imageData, {
    maxSize: 200,
    rootMargin: '150px',
    enabled: !!right.imageData && !right.isBlank
  });

  return (
    <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700/50">
      <div className="text-[10px] text-gray-500 mb-1 font-mono flex justify-between">
        <span>Spread #{spreadNum}</span>
        <span className="text-orange-400/60">{left.id}-{right.id}</span>
      </div>
      <div className="flex gap-0.5 rounded-lg overflow-hidden">
        <div ref={setLeftRef} className={`flex-1 aspect-[3/4] relative ${left.isBlank ? "bg-gray-700/50" : "bg-gray-800"}`}>
          {leftLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : leftUrl && !left.isBlank ? (
            <img src={leftUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <span className="text-gray-600 text-[10px]">{left.id}</span>
            </div>
          )}
          {left.isBlank && (
            <div className="absolute inset-0 bg-gray-800/80 flex flex-col items-center justify-center">
              <span className="text-[8px] text-gray-500 font-bold">BLANCO</span>
            </div>
          )}
          {!left.isBlank && left.imgNum && (
            <div className="absolute bottom-0 left-0 right-0 py-0.5 bg-black/70 text-center">
              <span className="text-[8px] text-orange-400">Img {left.imgNum}</span>
            </div>
          )}
        </div>
        
        <div ref={setRightRef} className={`flex-1 aspect-[3/4] relative ${right.isBlank ? "bg-gray-700/50" : "bg-gray-800"}`}>
          {rightLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : rightUrl && !right.isBlank ? (
            <img src={rightUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <span className="text-gray-600 text-[10px]">{right.id}</span>
            </div>
          )}
          {right.isBlank && (
            <div className="absolute inset-0 bg-gray-800/80 flex flex-col items-center justify-center">
              <span className="text-[8px] text-gray-500 font-bold">BLANCO</span>
            </div>
          )}
          {!right.isBlank && right.imgNum && (
            <div className="absolute bottom-0 left-0 right-0 py-0.5 bg-black/70 text-center">
              <span className="text-[8px] text-orange-400">Img {right.imgNum}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

SpreadThumbnail.displayName = "SpreadThumbnail";
