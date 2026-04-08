import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, mkdir } from "@tauri-apps/plugin-fs";

export type CompressionLevel = "light" | "medium" | "high";

export interface CompressionResult {
  success: boolean;
  output_path?: string;
  original_size: number;
  compressed_size?: number;
  compression_ratio?: string;
  error?: string;
}

/**
 * Verifica si Ghostscript está instalado
 */
export async function checkGhostscriptInstalled(): Promise<boolean> {
  try {
    return await invoke("check_ghostscript");
  } catch {
    return false;
  }
}

/**
 * Comprime un archivo PDF usando Ghostscript (backend Rust)
 */
export async function compressPDFWithGhostscript(
  inputPath: string,
  outputPath: string,
  level: CompressionLevel
): Promise<CompressionResult> {
  try {
    const result = await invoke<CompressionResult>("compress_pdf", {
      inputPath,
      outputPath,
      level,
    });
    return result;
  } catch (error) {
    return {
      success: false,
      original_size: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Comprime múltiples PDFs
 */
export async function compressPDFsBatch(
  files: string[],
  outputDir: string,
  level: CompressionLevel
): Promise<CompressionResult[]> {
  try {
    const results = await invoke<CompressionResult[]>("compress_pdfs_batch", {
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
 * Guarda un archivo Uint8Array usando el diálogo nativo
 */
export async function saveCompressedFile(
  data: Uint8Array,
  suggestedName: string
): Promise<boolean> {
  try {
    const savePath = await save({
      filters: [
        {
          name: "PDF",
          extensions: ["pdf"],
        },
      ],
      defaultPath: suggestedName,
    });

    if (savePath) {
      await writeFile(savePath, data);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error guardando archivo:", error);
    return false;
  }
}

/**
 * Crea directorio temporal
 */
export async function createTempDir(): Promise<string> {
  const tempDir = await invoke<string>("plugin:fs|get_temp_dir");
  const compressDir = `${tempDir}/tools33_compress`;
  await mkdir(compressDir, { recursive: true });
  return compressDir;
}

/**
 * Formatea tamaño de bytes
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
