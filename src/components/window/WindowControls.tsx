import { useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface WindowControlsProps {
  className?: string;
}

export function WindowControls({ className = "" }: WindowControlsProps) {
  const appWindow = getCurrentWindow();

  // Botón Minimizar
  const handleMinimize = useCallback(async () => {
    try {
      await appWindow.minimize();
    } catch (error) {
      console.error("Error al minimizar:", error);
    }
  }, [appWindow]);

  // Botón Maximizar
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

  // Botón Cerrar
  const handleClose = useCallback(async () => {
    try {
      await appWindow.close();
    } catch (error) {
      console.error("Error al cerrar:", error);
    }
  }, [appWindow]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Botón Minimizar */}
      <button
        onClick={handleMinimize}
        className="w-5 h-5 rounded-md bg-black border border-[#f97316] text-[#f97316] hover:bg-[#f97316] hover:text-black hover:shadow-[0_0_8px_#f97316] transition-all duration-150 flex items-center justify-center"
        aria-label="Minimizar"
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M5 12h14" />
        </svg>
      </button>

      {/* Botón Maximizar */}
      <button
        onClick={handleMaximize}
        className="w-5 h-5 rounded-md bg-black border border-[#f97316] text-[#f97316] hover:bg-[#f97316] hover:text-black hover:shadow-[0_0_8px_#f97316] transition-all duration-150 flex items-center justify-center"
        aria-label="Maximizar"
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <rect x="4" y="4" width="16" height="16" rx="1" />
        </svg>
      </button>

      {/* Botón Cerrar */}
      <button
        onClick={handleClose}
        className="w-5 h-5 rounded-md bg-black border border-[#f97316] text-[#f97316] hover:bg-[#f97316] hover:text-black hover:shadow-[0_0_8px_#f97316] transition-all duration-150 flex items-center justify-center"
        aria-label="Cerrar"
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
