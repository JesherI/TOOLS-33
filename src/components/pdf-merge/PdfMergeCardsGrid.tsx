import { memo } from "react";
import { PdfMergeFileCard } from "./PdfMergeFileCard";
import { PdfMergeAddCard } from "./PdfMergeAddCard";

interface PdfFile {
  id: string;
  name: string;
  size: number;
  path?: string;
  pageCount?: number;
}

interface PdfMergeCardsGridProps {
  files: PdfFile[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
  onAddMore?: () => void;
  onReorder?: (files: PdfFile[]) => void;
}

export const PdfMergeCardsGrid = memo(({
  files,
  selectedId,
  onSelect,
  onRemove,
  onAddMore,
  onReorder
}: PdfMergeCardsGridProps) => {
  const handleMoveUp = (index: number) => {
    if (index === 0 || !onReorder) return;
    const newFiles = [...files];
    [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
    onReorder(newFiles);
  };

  const handleMoveDown = (index: number) => {
    if (index === files.length - 1 || !onReorder) return;
    const newFiles = [...files];
    [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
    onReorder(newFiles);
  };

  return (
    <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto p-2 scrollbar-thin">
      {files.map((file, index) => (
        <PdfMergeFileCard
          key={file.id}
          name={file.name}
          size={file.size}
          pageCount={file.pageCount}
          isSelected={selectedId === file.id}
          index={index}
          totalCount={files.length}
          onSelect={() => onSelect?.(file.id)}
          onRemove={() => onRemove?.(file.id)}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
        />
      ))}

      {/* Add More */}
      {onAddMore && (
        <PdfMergeAddCard onClick={onAddMore} />
      )}
    </div>
  );
});

PdfMergeCardsGrid.displayName = "PdfMergeCardsGrid";
