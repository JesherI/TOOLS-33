import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";

interface SystemInfo {
  os_name: string;
  os_version: string;
  cpu: string;
  ram_gb: string;
  gpu: string;
  hostname: string;
  architecture: string;
}

export function HomeScreen() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener información del sistema desde Rust
    invoke<SystemInfo>("get_system_info")
      .then((info) => {
        setSystemInfo(info);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error obteniendo info del sistema:", error);
        setLoading(false);
      });
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
              TOOLS 33 v0.1.5 - Powered by Tauri & React
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para cada tarjeta de información
interface InfoCardProps {
  icon: "os" | "pc" | "cpu" | "ram" | "gpu";
  label: string;
  value: string;
  subvalue: string;
  className?: string;
}

function InfoCard({ icon, label, value, subvalue, className = "" }: InfoCardProps) {
  const icons = {
    os: (
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    ),
    pc: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </>
    ),
    cpu: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
      </>
    ),
    ram: (
      <>
        <path d="M2 12h20M2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6M6 12V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8" />
        <path d="M6 12h12" />
      </>
    ),
    gpu: (
      <>
        <path d="M2 7v10M22 7v10M2 12h20M7 12v5M17 12v5M12 12v5" />
        <rect x="2" y="5" width="20" height="14" rx="2" />
      </>
    ),
  };

  return (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-500/20 shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {icons[icon]}
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-sm text-gray-200 font-medium truncate" title={value}>
            {value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{subvalue}</p>
        </div>
      </div>
    </div>
  );
}
