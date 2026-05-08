import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SystemInfo {
  os_name: string;
  os_version: string;
  cpu: string;
  ram_gb: string;
  gpu: string;
  hostname: string;
  architecture: string;
}

// Cache global para la información del sistema
let cachedSystemInfo: SystemInfo | null = null;
let isLoading = false;
let loadingPromise: Promise<SystemInfo> | null = null;

export function useSystemInfo() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(cachedSystemInfo);
  const [loading, setLoading] = useState(!cachedSystemInfo);

  const fetchSystemInfo = useCallback(async () => {
    // Si ya tenemos datos en caché, no volver a cargar
    if (cachedSystemInfo) {
      setSystemInfo(cachedSystemInfo);
      setLoading(false);
      return;
    }

    // Si ya hay una carga en progreso, esperar a que termine
    if (isLoading && loadingPromise) {
      try {
        const info = await loadingPromise;
        setSystemInfo(info);
        setLoading(false);
      } catch (error) {
        console.error("Error obteniendo info del sistema:", error);
        setLoading(false);
      }
      return;
    }

    // Iniciar nueva carga
    isLoading = true;
    setLoading(true);

    loadingPromise = invoke<SystemInfo>("get_system_info");

    try {
      const info = await loadingPromise;
      cachedSystemInfo = info;
      setSystemInfo(info);
    } catch (error) {
      console.error("Error obteniendo info del sistema:", error);
    } finally {
      setLoading(false);
      isLoading = false;
      loadingPromise = null;
    }
  }, []);

  useEffect(() => {
    fetchSystemInfo();
  }, [fetchSystemInfo]);

  return { systemInfo, loading, refetch: fetchSystemInfo };
}
