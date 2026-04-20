import { invoke } from "@tauri-apps/api/core";

export type CompressionLevel = "light" | "medium" | "high";

export interface CompressionResult {
  success: boolean;
  original_size: number;
  compressed_size?: number;
  compression_ratio?: string;
  error?: string;
}

/**
 * Comprime un archivo PDF usando Ghostscript
 * Ghostscript se instala automáticamente con TOOLS 33
 */
export async function compressPDFWithRust(
  inputPath: string,
  outputPath: string,
  level: CompressionLevel,
  architectMode: boolean = false
): Promise<CompressionResult> {
  console.log(`[compressPDFWithRust] Iniciando...`, { inputPath, outputPath, level });
  
  try {
    const result = await invoke<CompressionResult>("compress_pdf_rust", {
      inputPath,
      outputPath,
      level,
      architectMode,
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
