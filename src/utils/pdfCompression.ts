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
 * Comprime un archivo PDF usando Rust puro (lopdf)
 * Sin dependencias externas - todo en Rust
 */
export async function compressPDFWithRust(
  inputPath: string,
  outputPath: string,
  level: CompressionLevel
): Promise<CompressionResult> {
  console.log(`[compressPDFWithRust] Iniciando...`, { inputPath, outputPath, level });
  
  try {
    console.log(`[compressPDFWithRust] Llamando a invoke...`);
    const result = await invoke<CompressionResult>("compress_pdf_rust", {
      inputPath,
      outputPath,
      level,
    });
    console.log(`[compressPDFWithRust] Resultado recibido:`, result);
    return result;
  } catch (error) {
    console.error(`[compressPDFWithRust] ERROR:`, error);
    console.error(`[compressPDFWithRust] Tipo de error:`, typeof error);
    
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
 * Comprime múltiples PDFs
 */
export async function compressPDFsBatchRust(
  files: string[],
  outputDir: string,
  level: CompressionLevel
): Promise<CompressionResult[]> {
  try {
    const results = await invoke<CompressionResult[]>("compress_pdfs_batch_rust", {
      files,
      outputDir,
      level,
    });
    return results;
  } catch (error) {
    return files.map(() => ({
      success: false,
      original_size: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    }));
  }
}

/**
 * Verifica si la compresión está disponible
 * Con lopdf siempre está disponible (sin dependencias externas)
 */
export async function checkCompressionAvailable(): Promise<boolean> {
  try {
    return await invoke("check_compression_available");
  } catch {
    return true;
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
 * Obtiene información detallada del nivel de compresión
 */
export function getCompressionDetails(level: CompressionLevel): {
  title: string;
  description: string;
  features: string[];
} {
  switch (level) {
    case "light":
      return {
        title: "Compresión Ligera",
        description: "Optimización básica sin pérdida de calidad",
        features: [
          "Elimina metadatos innecesarios",
          "Optimiza estructura del PDF",
          "Sin pérdida de calidad",
          "Mantiene capas y vectores",
          "Reducción: 10-20%",
        ],
      };
    case "medium":
      return {
        title: "Compresión Media",
        description: "Balance calidad/tamaño con lopdf",
        features: [
          "Compresión de imágenes al 65%",
          "Optimización agresiva",
          "Mantiene texto seleccionable",
          "Reducción: 30-50%",
        ],
      };
    case "high":
      return {
        title: "Compresión Alta",
        description: "Máxima compresión pura Rust",
        features: [
          "Compresión de imágenes al 45%",
          "Compresión zlib máxima",
          "Elimina redundancias",
          "Reducción: 50-80%",
        ],
      };
    default:
      return {
        title: "",
        description: "",
        features: [],
      };
  }
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

/**
 * Obtiene el método de compresión actual
 */
export async function getCompressionMethod(): Promise<string> {
  try {
    return await invoke("get_compression_method");
  } catch {
    return "basic";
  }
}

/**
 * Instala Ghostscript automáticamente
 */
export async function installGhostscript(): Promise<boolean> {
  try {
    return await invoke("install_ghostscript");
  } catch (error) {
    console.error("Error instalando Ghostscript:", error);
    return false;
  }
}

/**
 * Debug: Obtiene información detallada sobre la detección de Ghostscript
 */
export async function debugGhostscript(): Promise<{
  found: boolean;
  found_path: string | null;
  checked_paths: Array<{ path: string; result: string }>;
  dynamic_dirs_found: string[];
  recommendation: string;
}> {
  try {
    return await invoke("debug_ghostscript");
  } catch (error) {
    console.error("Error en debug:", error);
    return {
      found: false,
      found_path: null,
      checked_paths: [],
      dynamic_dirs_found: [],
      recommendation: "Error al ejecutar debug"
    };
  }
}
