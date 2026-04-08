import { invoke } from "@tauri-apps/api/core";
import { ask, message } from "@tauri-apps/plugin-dialog";

interface UpdateInfo {
  available: boolean;
  version?: string;
  body?: string;
}

/**
 * Verifica si hay actualizaciones disponibles
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    const info = await invoke<UpdateInfo>("check_for_updates");
    return info;
  } catch (error) {
    console.error("Error checking for updates:", error);
    return { available: false };
  }
}

/**
 * Instala la actualización disponible
 */
export async function installUpdate(): Promise<void> {
  try {
    await invoke("install_update");
  } catch (error) {
    console.error("Error installing update:", error);
    throw error;
  }
}

/**
 * Verifica e instala actualizaciones con diálogo de confirmación
 * Llama a esto desde un botón en la UI
 */
export async function checkAndPromptUpdate(): Promise<void> {
  try {
    const info = await checkForUpdates();
    
    if (info.available && info.version) {
      const shouldUpdate = await ask(
        `Hay una nueva versión disponible: ${info.version}\n\n${
          info.body ? info.body.substring(0, 200) + "..." : ""
        }\n\n¿Deseas instalarla ahora?`,
        {
          title: "Actualización disponible",
          kind: "info",
        }
      );
      
      if (shouldUpdate) {
        await message("Descargando e instalando actualización... La aplicación se reiniciará automáticamente.", {
          title: "Instalando actualización",
        });
        
        await installUpdate();
      }
    } else {
      await message("Tienes la última versión instalada.", {
        title: "Sin actualizaciones",
        kind: "info",
      });
    }
  } catch (error) {
    console.error("Error in update process:", error);
    await message("No se pudo verificar actualizaciones. Intenta más tarde.", {
      title: "Error",
      kind: "error",
    });
  }
}

/**
 * Verifica actualizaciones silenciosamente (sin mostrar diálogos si no hay)
 * Útil para verificación automática al iniciar
 */
export async function checkUpdatesSilent(): Promise<boolean> {
  try {
    const info = await checkForUpdates();
    return info.available;
  } catch {
    return false;
  }
}
