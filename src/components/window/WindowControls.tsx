import { useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface WindowControlsProps {
  className?: string;
}

export function WindowControls({ className = "" }: WindowControlsProps) {
  const appWindow = getCurrentWindow();

  // Botón amarillo - Minimizar a la barra de tareas
  const handleMinimize = useCallback(async () => {
    try {
      await appWindow.minimize();
    } catch (error) {
      console.error("Error al minimizar:", error);
    }
  }, [appWindow]);

  // Botón verde - Maximizar/Restaurar
  const handleMaximize = useCallback(async () => {
    try {
      const isMaximized = await appWindow.isMaximized();
      if (isMaximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
    } catch (error) {
      console.error("Error al maximizar:", error);
    }
  }, [appWindow]);

  // Botón rojo - Cerrar
  const handleClose = useCallback(async () => {
    try {
      await appWindow.close();
    } catch (error) {
      console.error("Error al cerrar:", error);
    }
  }, [appWindow]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Botón Cerrar - Rojo */}
      <button
        onClick={handleClose}
        className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 transition-all duration-150 flex items-center justify-center group"
        aria-label="Cerrar"
      >
        <svg
          className="w-2.5 h-2.5 text-black opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Botón Minimizar - Amarillo */}
      <button
        onClick={handleMinimize}
        className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-110 transition-all duration-150 flex items-center justify-center group"
        aria-label="Minimizar"
      >
        <svg
          className="w-2.5 h-2.5 text-black opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M5 12h14" />
        </svg>
      </button>

      {/* Botón Maximizar - Verde */}
      <button
        onClick={handleMaximize}
        className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-110 transition-all duration-150 flex items-center justify-center group"
        aria-label="Maximizar"
      >
        <svg
          className="w-2.5 h-2.5 text-black opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        </svg>
      </button>
    </div>
  );
}
