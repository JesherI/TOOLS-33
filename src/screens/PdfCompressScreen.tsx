import { useState } from "react";
import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";
import { ToastContainer, useToast } from "../components/toast/Toast";
import {
  FileList,
  FileListHeader,
  CompressionLevelSelector,
  FlattenModeToggle,
  CompressButton,
  SuccessMessage,
  type FileItemData,
} from "../components/pdf";
import {
  compressPdfUltra,
  CompressionLevel,
  type ProgressEvent,
} from "../utils";

interface PdfCompressScreenProps {
  onNavigate?: (_screen: "home" | "pdf-compress" | "pdf-merge" | "magazine" | "image-scaler") => void;
}

interface FileItem {
  id: string;
  path: string;
  name: string;
  size: number;
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
  const { toasts, showToast, removeToast } = useToast();

  // Open native file dialog to select PDFs
  const openFiles = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { stat } = await import("@tauri-apps/plugin-fs");

    const selected = await open({
      multiple: true,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      title: "Seleccionar archivos PDF",
    });

    if (!selected) return;

    const paths: string[] = Array.isArray(selected) ? selected : [];

    const newFiles: FileItem[] = [];
    for (const path of paths) {
      let size = 0;
      try {
        const info = await stat(path);
        size = info.size ?? 0;
      } catch { /* ignore */ }
      const name = path.split(/[/\\]/).pop() || "unknown.pdf";
      newFiles.push({
        id: crypto.randomUUID(),
        path,
        name,
        size,
        status: "pending",
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setPhase("list");
  };

  // Remove file from list
  const removeFile = (id: string) => {
    setFiles((prev) => {
      const newFiles = prev.filter((f) => f.id !== id);
      if (newFiles.length === 0) setPhase("upload");
      return newFiles;
    });
  };

  // Clear all files
  const clearFiles = () => {
    setFiles([]);
    setPhase("upload");
  };

  // ──────────────────────────────────────────────
  // Compress — ULTRA FAST (paralelo + multicore, 0 binary IPC)
  // ──────────────────────────────────────────────
  const handleCompress = async () => {
    const { open: pickDir } = await import("@tauri-apps/plugin-dialog");
    const outputDir = await pickDir({
      directory: true,
      multiple: false,
      title: "Carpeta para PDFs comprimidos",
    });
    if (!outputDir) return;

    setPhase("compressing");
    setFiles((prev) =>
      prev.map((f) => ({ ...f, status: "compressing" as const, progress: 5 }))
    );

    try {
      // Pass ONLY file paths to Rust — no binary data via IPC
      const fileInputs = files.map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
      }));

      const results = await compressPdfUltra(
        fileInputs,
        compressionLevel,
        flattenMode,
        outputDir,
        (event: ProgressEvent) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === event.fileId
                ? { ...f, progress: event.progress }
                : f
            )
          );
        }
      );

      setFiles((prev) =>
        prev.map((f) => {
          const r = results.find((res) => res.fileId === f.id);
          if (!r) return f;
          return r.success
            ? { ...f, status: "done" as const, progress: 100, compressedSize: r.compressedSize, compressionRatio: r.compressionRatio }
            : { ...f, status: "error" as const, errorMessage: r.error || "Error" };
        })
      );

      for (const r of results) {
        showToast(
          r.success
            ? `${r.fileName} → ${r.compressionRatio || "0%"}`
            : `${r.fileName}: ${r.error || "Error"}`,
          r.success ? "success" : "error"
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error";
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "compressing"
            ? { ...f, status: "error" as const, errorMessage: msg }
            : f
        )
      );
      showToast(`Error: ${msg}`, "error");
    }

    setPhase("list");
  };

  const fileItemsData: FileItemData[] = files.map((f) => ({
    id: f.id, name: f.name, size: f.size,
    status: f.status, progress: f.progress,
    compressedSize: f.compressedSize, compressionRatio: f.compressionRatio,
    errorMessage: f.errorMessage,
  }));

  const allCompressed = files.every((f) => f.status === "done");
  const isCompressing = phase === "compressing";

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <div className="absolute top-4 right-4 z-50" data-tauri-drag-region>
        <WindowControls />
      </div>

      <ParticleCanvas
        config={{
          connectionDistance: 120,
          mouseInfluenceRadius: 300,
          mouseInfluenceStrength: 0.03,
          returnSpeed: 0.05,
          colors: { particle: "#f97316", connection: "rgba(249, 115, 22," },
        }}
        density={15000}
      />

      <div className="absolute inset-0 pl-20 flex items-center justify-center">
        <div className="w-full max-w-4xl mx-8">
          {phase === "upload" ? (
            // Upload screen — big "Upload" button using native dialog
            <button
              onClick={openFiles}
              className="w-full bg-black/60 backdrop-blur-xl border-2 border-dashed border-white/20 rounded-3xl p-20 flex flex-col items-center justify-center gap-6 hover:border-orange-500/50 transition-all cursor-pointer group"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v12m0 0l-3-3m3 3l3-3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
              </div>
              <span className="text-xl font-medium text-white">Seleccionar archivos PDF</span>
              <span className="text-sm text-gray-400">Usa el diálogo nativo — sin límite de tamaño</span>
            </button>
          ) : (
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              <FileListHeader
                fileCount={files.length}
                isCompressing={isCompressing}
                onClear={clearFiles}
              />

              <FileList
                files={fileItemsData}
                isCompressing={isCompressing}
                onRemove={removeFile}
              />

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

              {!allCompressed && (
                <div className="flex gap-3">
                  <CompressButton
                    isCompressing={isCompressing}
                    fileCount={files.length}
                    onClick={handleCompress}
                  />
                  <button
                    onClick={openFiles}
                    disabled={isCompressing}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl px-5 py-3 transition-all disabled:opacity-50"
                  >
                    + Agregar más
                  </button>
                </div>
              )}

              {allCompressed && <SuccessMessage />}
            </div>
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
