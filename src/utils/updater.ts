import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask, message } from "@tauri-apps/plugin-dialog";

export interface UpdateInfo {
  available: boolean;
  version?: string;
  body?: string;
  error?: string;
}

export interface UpdatePreferences {
  skippedVersion?: string;
  postponedUntil?: number;
}

const PREFS_KEY = "tools33_update_prefs";

export function getUpdatePreferences(): UpdatePreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

export function setUpdatePreferences(prefs: UpdatePreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

export function skipVersion(version: string): void {
  const prefs = getUpdatePreferences();
  prefs.skippedVersion = version;
  setUpdatePreferences(prefs);
}

export function postponeUpdate(hours: number = 24): void {
  const prefs = getUpdatePreferences();
  prefs.postponedUntil = Date.now() + hours * 60 * 60 * 1000;
  setUpdatePreferences(prefs);
}

export function canCheckForUpdate(): boolean {
  const prefs = getUpdatePreferences();
  
  if (prefs.postponedUntil && prefs.postponedUntil > Date.now()) {
    return false;
  }
  
  return true;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  if (!canCheckForUpdate()) {
    return { available: false };
  }

  try {
    const update = await check();
    
    if (!update) {
      return { available: false };
    }

    const prefs = getUpdatePreferences();
    
    if (prefs.skippedVersion === update.version) {
      return { available: false };
    }

    return {
      available: true,
      version: update.version,
      body: update.body || "Nueva versión disponible",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const isNetworkError = 
      errorMessage.includes("network") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("dns") ||
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("request failed") ||
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("net::");

    if (isNetworkError) {
      console.warn("Update check failed due to network error:", errorMessage);
      return { 
        available: false, 
        error: "No se pudo conectar al servidor de actualizaciones" 
      };
    }

    console.error("Update check failed:", error);
    return { 
      available: false, 
      error: "Error al verificar actualizaciones" 
    };
  }
}

export async function downloadAndInstall(): Promise<boolean> {
  try {
    const update = await check();
    
    if (!update) {
      await message("No hay actualizaciones disponibles", {
        title: "TOOLS 33",
        kind: "info",
      });
      return false;
    }

    const shouldUpdate = await ask(
      `¿Deseas actualizar a la versión ${update.version}?\n\nLa aplicación se reiniciará para completar la actualización.`,
      {
        title: "Actualización Disponible",
        kind: "info",
        okLabel: "Actualizar",
        cancelLabel: "Cancelar",
      }
    );

    if (!shouldUpdate) {
      return false;
    }

    await update.downloadAndInstall();
    await relaunch();
    
    return true;
  } catch (error) {
    console.error("Update installation failed:", error);
    await message(
      `Error al instalar la actualización: ${error instanceof Error ? error.message : String(error)}`,
      {
        title: "Error de Actualización",
        kind: "error",
      }
    );
    return false;
  }
}
