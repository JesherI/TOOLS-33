import { useState, useRef, useCallback } from "react";
import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";
import { ToastContainer, useToast } from "../components/toast/Toast";
import {
  FileDropZone,
  FileList,
  FileListHeader,
  CompressionLevelSelector,
  FlattenModeToggle,
  CompressButton,
  SuccessMessage,
  AddFilesButton,
  type FileItemData,
} from "../components/pdf";
import {
  compressPDFWithRust,
  CompressionLevel,
} from "../utils";

interface PdfCompressScreenProps {
  onNavigate?: (_screen: "home" | "pdf-compress" | "pdf-merge" | "magazine" | "image-scaler") => void;
}

interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: "pending" | "compressing" | "done" | "error";
  progress?: number;
  compressedSize?: number;
  compressionRatio?: string;
  errorMessage?: string;
}

export function PdfCompressScreen({ onNavigate: _onNavigate }: PdfCompressScreenProps) {
  const [phase, setPhase] = useState<"upload" | "list" | "compressing">("upload");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>("medium");
  const [flattenMode, setFlattenMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, showToast, removeToast } = useToast();

  // Handle files selected
  const handleFiles = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileItem[] = Array.from(selectedFiles).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "pending",
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    setPhase("list");
  }, []);

  // Remove file from list
  const removeFile = (id: string) => {
    setFiles((prev) => {
      const newFiles = prev.filter((f) => f.id !== id);
      if (newFiles.length === 0) {
        setPhase("upload");
      }
      return newFiles;
    });
  };

  // Clear all files
  const clearFiles = () => {
    setFiles([]);
    setPhase("upload");
  };

  // Compress files
  const handleCompress = async () => {
    setPhase("compressing");
    
    const { writeFile, readFile, remove, BaseDirectory } = await import("@tauri-apps/plugin-fs");
    
    for (const fileItem of files) {
      if (fileItem.status === "done") continue;

      // Mark as compressing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id ? { ...f, status: "compressing", progress: 10 } : f
        )
      );

      try {
        // Save temporary file
        const arrayBuffer = await fileItem.file.arrayBuffer();
        const tempInput = `input_${fileItem.id}.pdf`;
        const tempOutput = `output_${fileItem.id}.pdf`;
        
        await writeFile(tempInput, new Uint8Array(arrayBuffer), {
          baseDir: BaseDirectory.Temp,
        });

        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, progress: 30 } : f))
        );

        // Compress with Ghostscript
        const result = await compressPDFWithRust(
          tempInput,
          tempOutput,
          compressionLevel,
          flattenMode
        );

        setFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, progress: 80 } : f))
        );

        if (result.success) {
          // Read compressed file
          const compressedData = await readFile(tempOutput, {
            baseDir: BaseDirectory.Temp,
          });

          // Download with descriptive name
          const blob = new Blob([compressedData], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          
          // Create name with suffix
          const baseName = fileItem.name.replace(/\.pdf$/i, "");
          const levelSuffix =
            compressionLevel === "light"
              ? "light"
              : compressionLevel === "medium"
              ? "medium"
              : "high";
          const newFileName = `${baseName}_compressed_${levelSuffix}.pdf`;
          
          link.download = newFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          // Clean up temporary files
          await remove(tempInput, { baseDir: BaseDirectory.Temp }).catch(() => {});
          await remove(tempOutput, { baseDir: BaseDirectory.Temp }).catch(() => {});

          // Update status
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? {
                    ...f,
                    status: "done",
                    progress: 100,
                    compressedSize: result.compressed_size,
                    compressionRatio: result.compression_ratio,
                  }
                : f
            )
          );

          showToast(
            `${fileItem.name} comprimido (${result.compression_ratio || "0%"} reducción)`,
            "success"
          );
        } else {
          throw new Error(result.error || "Error en compresión");
        }
      } catch (error) {
        console.error(`Error en archivo ${fileItem.name}:`, error);
        
        let errorMsg = "Error al procesar archivo";
        if (error instanceof Error) {
          errorMsg = error.message;
        }
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: "error",
                  errorMessage: errorMsg,
                }
              : f
          )
        );
      }
    }

    setPhase("list");
  };

  // Map FileItem to FileItemData for the component
  const fileItemsData: FileItemData[] = files.map((f) => ({
    id: f.id,
    name: f.name,
    size: f.size,
    status: f.status,
    progress: f.progress,
    compressedSize: f.compressedSize,
    compressionRatio: f.compressionRatio,
    errorMessage: f.errorMessage,
  }));

  const allCompressed = files.every((f) => f.status === "done");
  const isCompressing = phase === "compressing";

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Window Controls */}
      <div className="absolute top-4 right-4 z-50" data-tauri-drag-region>
        <WindowControls />
      </div>

      {/* Particles Background */}
      <ParticleCanvas
        config={{
          connectionDistance: 120,
          mouseInfluenceRadius: 300,
          mouseInfluenceStrength: 0.03,
          returnSpeed: 0.05,
          colors: {
            particle: "#f97316",
            connection: "rgba(249, 115, 22,",
          },
        }}
        density={15000}
      />

      {/* Main Content */}
      <div className="absolute inset-0 pl-20 flex items-center justify-center">
        <div className="w-full max-w-4xl mx-8">
          {phase === "upload" ? (
            <FileDropZone
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              onFilesSelected={handleFiles}
              badge={{ text: "Powered by Ghostscript", color: "green" }}
            />
          ) : (
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              {/* Header */}
              <FileListHeader
                fileCount={files.length}
                isCompressing={isCompressing}
                onClear={clearFiles}
              />

              {/* File List */}
              <FileList
                files={fileItemsData}
                isCompressing={isCompressing}
                onRemove={removeFile}
              />

              {/* Compression Level Selector */}
              {!isCompressing && !allCompressed && (
                <div className="mb-6">
                  <FlattenModeToggle
                    enabled={flattenMode}
                    onChange={setFlattenMode}
                    disabled={isCompressing}
                  />
                  <CompressionLevelSelector
                    level={compressionLevel}
                    onChange={setCompressionLevel}
                    disabled={isCompressing}
                  />
                </div>
              )}

              {/* Compress Button */}
              {!allCompressed && (
                <CompressButton
                  isCompressing={isCompressing}
                  fileCount={files.length}
                  onClick={handleCompress}
                />
              )}

              {/* Success Message */}
              {allCompressed && <SuccessMessage />}

              {/* Add More Files Button */}
              {!isCompressing && (
                <AddFilesButton fileInputRef={fileInputRef} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
