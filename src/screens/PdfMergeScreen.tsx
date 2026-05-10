import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { tempDir } from "@tauri-apps/api/path";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeFile, remove } from "@tauri-apps/plugin-fs";
import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";
import { ToastContainer, useToast } from "../components/toast/Toast";
import {
  PdfMergeEmptyState,
  PdfMergeCardsGrid,
  MergeButton,
} from "../components/pdf-merge";

interface MergePdfFile {
  id: string;
  name: string;
  size: number;
  path?: string;
  pageCount?: number;
}

interface PdfInfoResult {
  path: string;
  name: string;
  size: number;
  page_count: number;
}

interface PdfMergeScreenProps {
  onNavigate?: (screen: "home" | "pdf-compress" | "pdf-merge" | "magazine" | "image-scaler" | "texture-generator") => void;
}

export function PdfMergeScreen({ onNavigate: _onNavigate }: PdfMergeScreenProps) {
  const [files, setFiles] = useState<MergePdfFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  const processPaths = useCallback(async (items: { path: string; name: string }[]) => {
    try {
      const paths = items.map((i) => i.path);
      const infos = await invoke<PdfInfoResult[]>("get_pdf_info", { paths });
      const newFiles: MergePdfFile[] = infos.map((info, idx) => ({
        id: Math.random().toString(36).substring(7),
        name: items[idx]?.name || info.name,
        size: info.size,
        path: info.path,
        pageCount: info.page_count,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    } catch (e) {
      console.error("Error getting PDF info:", e);
    }
  }, []);

  const handleFilesSelected = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const temp = await tempDir();
    const items: { path: string; name: string }[] = [];

    for (const file of Array.from(selectedFiles)) {
      const arrayBuffer = await file.arrayBuffer();
      const tempPath = `${temp}\\tools33_merge_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.pdf`;
      await writeFile(tempPath, new Uint8Array(arrayBuffer));
      items.push({ path: tempPath, name: file.name });
    }

    await processPaths(items);
  }, [processPaths]);

  const handleAddMore = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        title: "Seleccionar archivos PDF",
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        const items = paths.map((path) => ({
          path,
          name: path.replace(/\\/g, "/").split("/").pop() || "unknown.pdf",
        }));
        await processPaths(items);
      }
    } catch (error) {
      console.error("Error selecting files:", error);
    }
  }, [processPaths]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.path?.includes("tools33_merge_")) {
        remove(fileToRemove.path).catch(() => {});
      }
      return prev.filter((f) => f.id !== id);
    });
    setSelectedId((current) => (current === id ? null : current));
  }, []);

  const handleClearAll = useCallback(() => {
    files.forEach((file) => {
      if (file.path?.includes("tools33_merge_")) {
        remove(file.path).catch(() => {});
      }
    });
    setFiles([]);
    setSelectedId(null);
  }, [files]);

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return;

    setIsMerging(true);

    try {
      const outputPath = await save({
        defaultPath: "unidos.pdf",
        filters: [{ name: "PDF", extensions: ["pdf"] }],
        title: "Guardar PDF combinado",
      });

      if (!outputPath) {
        setIsMerging(false);
        return;
      }

      const inputPaths = files.map((f) => f.path).filter((p): p is string => !!p);
      await invoke("merge_pdfs", { inputPaths, outputPath });
      showToast(`PDF unido guardado en:\n${outputPath}`, "success");

      // Cleanup temp files after successful merge
      files.forEach((file) => {
        if (file.path?.includes("tools33_merge_")) {
          remove(file.path).catch(() => {});
        }
      });

      setFiles([]);
      setSelectedId(null);
    } catch (error) {
      console.error("Error merging PDFs:", error);
    }

    setIsMerging(false);
  }, [files]);

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
      <div className="absolute inset-0 pl-20 flex items-center justify-center overflow-auto">
        <div className="w-full max-w-4xl mx-8">
          {files.length === 0 ? (
            <PdfMergeEmptyState onFilesSelected={handleFilesSelected} />
          ) : (
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
              {/* File List with reordering */}
              <PdfMergeCardsGrid
                files={files}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onRemove={handleRemoveFile}
                onAddMore={handleAddMore}
                onReorder={(newFiles) => setFiles(newFiles)}
              />

              {/* Buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200"
                >
                  Limpiar todo
                </button>
                <MergeButton
                  onClick={handleMerge}
                  disabled={files.length < 2 || isMerging}
                  fileCount={files.length}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
