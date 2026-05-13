import { invoke, Channel } from "@tauri-apps/api/core";

export type CompressionLevel = "light" | "medium" | "high";

export interface CompressionResult {
  success: boolean;
  original_size: number;
  compressed_size?: number;
  compression_ratio?: string;
  error?: string;
}

export interface CompressFileInput {
  id: string;
  name: string;
  path: string;
}

export interface ProgressEvent {
  fileId: string;
  fileName: string;
  phase: "reading" | "compressing" | "merging" | "done" | "error";
  progress: number;
  currentPage?: number;
  totalPages?: number;
}

export interface FileCompressResult {
  fileId: string;
  fileName: string;
  success: boolean;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: string;
  error?: string;
}

/**
 * Comprime uno o varios PDFs con la máxima velocidad posible:
 * - Archivos pequeños (<5 páginas): GS directo
 * - Archivos grandes (>4 páginas): split en chunks → compresión paralela (todos los núcleos) → merge
 * - Múltiples archivos: todos se procesan concurrentemente
 * - Guarda automáticamente en outputDir (Rust escribe directo, sin datos binarios por IPC)
 */
export async function compressPdfUltra(
  files: CompressFileInput[],
  level: CompressionLevel,
  flattenMode: boolean,
  outputDir: string,
  onProgress: (event: ProgressEvent) => void
): Promise<FileCompressResult[]> {
  const channel = new Channel<ProgressEvent>();
  channel.onmessage = onProgress;

  try {
    return await invoke<FileCompressResult[]>("compress_pdf_ultra", {
      files,
      level,
      flattenMode,
      outputDir,
      onEvent: channel,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return files.map((f) => ({
      fileId: f.id,
      fileName: f.name,
      success: false,
      originalSize: 0,
      error: msg,
    }));
  }
}

/**
 * Comprime un archivo PDF usando Ghostscript (legacy, secuencial)
 */
export async function compressPDFWithRust(
  inputPath: string,
  outputPath: string,
  level: CompressionLevel,
  flattenMode: boolean = false
): Promise<CompressionResult> {
  console.log(`[compressPDFWithRust] Iniciando...`, { inputPath, outputPath, level });
  
  try {
    const result = await invoke<CompressionResult>("compress_pdf_rust", {
      inputPath,
      outputPath,
      level,
      flattenMode,
    });
    console.log(`[compressPDFWithRust] Resultado:`, result);
    return result;
  } catch (error) {
    console.error(`[compressPDFWithRust] ERROR:`, error);
    
    let errorMessage = "Error desconocido";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    
    return {
      success: false,
      original_size: 0,
      error: errorMessage,
    };
  }
}

/**
 * Formatea tamaño de bytes a legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Descarga un archivo Uint8Array
 */
export function downloadCompressedFile(
  data: Uint8Array,
  filename: string
): void {
  const blob = new Blob([data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
