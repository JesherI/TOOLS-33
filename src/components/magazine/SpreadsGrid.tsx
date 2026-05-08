import { SpreadThumbnail } from "./SpreadThumbnail";
import type { PageItem } from "./PageThumbnail";

interface SpreadPreview {
  left: PageItem;
  right: PageItem;
  spreadNum: number;
}

interface SpreadsGridProps {
  spreads: SpreadPreview[];
}

export function SpreadsGrid({ spreads }: SpreadsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[55vh] overflow-y-auto p-2 scrollbar-hide">
      {spreads.map((spread) => (
        <SpreadThumbnail
          key={spread.spreadNum}
          left={spread.left}
          right={spread.right}
          spreadNum={spread.spreadNum}
        />
      ))}
    </div>
  );
}

export type { SpreadPreview };
