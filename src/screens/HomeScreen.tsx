import { useState, useEffect } from "react";
import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";
import { InfoCard } from "../components/system";
import { useSystemInfo } from "../hooks";
import { getVersion } from "@tauri-apps/api/app";

export function HomeScreen() {
  const { systemInfo, loading } = useSystemInfo();
  const [appVersion, setAppVersion] = useState<string>("");

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("0.4.0"));
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Window Controls - Top right */}
      <div
        className="absolute top-4 right-4 z-50"
        data-tauri-drag-region
      >
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

      {/* System Info Panel */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pl-16">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-2xl w-full mx-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center border border-orange-500/30">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-orange-500">Información del Sistema</h1>
              <p className="text-sm text-gray-400">Detalles del hardware y software</p>
            </div>
          </div>

          {/* System Info Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : systemInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OS Info */}
              <InfoCard
                icon="os"
                label="Sistema Operativo"
                value={systemInfo.os_version}
                subvalue={`${systemInfo.os_name} ${systemInfo.architecture}`}
              />

              {/* Hostname */}
              <InfoCard
                icon="pc"
                label="Nombre del Equipo"
                value={systemInfo.hostname}
                subvalue="Identificación de red"
              />

              {/* CPU */}
              <InfoCard
                icon="cpu"
                label="Procesador"
                value={systemInfo.cpu}
                subvalue="CPU"
                className="md:col-span-2"
              />

              {/* RAM */}
              <InfoCard
                icon="ram"
                label="Memoria RAM"
                value={systemInfo.ram_gb}
                subvalue="Memoria física total"
              />

              {/* GPU */}
              <InfoCard
                icon="gpu"
                label="Tarjeta Gráfica"
                value={systemInfo.gpu}
                subvalue="GPU"
                className="md:col-span-2"
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No se pudo obtener la información del sistema
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500">
              TOOLS 33 v{appVersion || "0.2.4"} - Powered by Tauri & React
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
