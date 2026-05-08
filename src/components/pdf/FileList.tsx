import { FileItem, FileItemData } from "./FileItem";

interface FileListProps {
  files: FileItemData[];
  isCompressing: boolean;
  onRemove: (id: string) => void;
}

export function FileList({ files, isCompressing, onRemove }: FileListProps) {
  return (
    <div className="space-y-2 mb-8 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-500/30 scrollbar-track-transparent hover:scrollbar-thumb-orange-500/50">
      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          isCompressing={isCompressing}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

// Re-export FileItem for convenience
export { type FileItemData } from "./FileItem";
