import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";
import { 
  FuturisticCard, 
  SystemProgressBar, 
  StatusIndicator, 
  FuturisticLoader,
  SystemErrorState 
} from "../components/system";

interface ParticlesScreenProps {
  onNavigate?: (_screen: "home" | "pdf-compress" | "magazine" | "image-scaler") => void;
}

interface SystemInfo {
  os_name: string;
  os_version: string;
  cpu: string;
  cpu_cores: number;
  cpu_threads: number;
  cpu_freq: string;
  ram_gb: string;
  ram_used: string;
  ram_percent: number;
  gpu: string;
  gpu_memory: string;
  hostname: string;
  architecture: string;
  disk_total: string;
  disk_used: string;
  disk_percent: number;
  uptime: string;
}

export function ParticlesScreen({ onNavigate: _onNavigate }: ParticlesScreenProps) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchSystemInfo = useCallback(async (showLoading = false) => {
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    if (showLoading) setIsUpdating(true);
    
    try {
      const info = await invoke<SystemInfo>("get_system_info");
      setSystemInfo(info);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error("Error obteniendo info del sistema:", error);
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
      setIsUpdating(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemInfo(true);
    
    const interval = setInterval(() => {
      fetchSystemInfo(false);
    }, 60000);
    
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, [fetchSystemInfo]);

  const getTimeSinceLastUpdate = () => {
    if (!lastUpdate) return "";
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `hace ${minutes}min`;
  };

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
        density={8000}
      />

      {/* Grid Background Effect */}
      <div 
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249, 115, 22, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Scanline Effect */}
      <div className="absolute inset-0 z-5 pointer-events-none opacity-5">
        <div 
          className="w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-scanline"
          style={{
            animation: 'scanline 4s linear infinite',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pl-20 pr-8 py-8">
        {loading ? (
          <FuturisticLoader />
        ) : systemInfo ? (
          <div className="w-full max-w-5xl max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-hide py-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500/30 to-orange-600/10 rounded-2xl flex items-center justify-center border border-orange-500/50 shadow-lg shadow-orange-500/30">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="1.5"
                      className="animate-pulse"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <div className="absolute -inset-1 bg-orange-500/20 rounded-2xl blur-xl animate-pulse" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                    SYSTEM MONITOR
                  </h1>
                  <p className="text-xs lg:text-sm text-orange-400/60 font-mono tracking-wider">
                    {systemInfo.hostname.toUpperCase()} // {systemInfo.architecture.toUpperCase()}
                  </p>
                </div>
              </div>
              
              {/* Clock */}
              <div className="text-center sm:text-right">
                <div className="text-xl lg:text-2xl font-mono font-bold text-orange-400">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-xs text-orange-400/60 font-mono">
                  UPTIME: {systemInfo.uptime}
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-12 gap-5">
              {/* CPU Card - Spans 7 columns */}
              <div className="col-span-12 lg:col-span-7">
                <FuturisticCard
                  icon="cpu"
                  title="PROCESSOR"
                  subtitle={`${systemInfo.cpu_cores} Cores / ${systemInfo.cpu_threads} Threads @ ${systemInfo.cpu_freq}`}
                >
                  <div className="mt-2">
                    <div className="text-base lg:text-lg text-white font-mono break-words leading-relaxed">
                      {systemInfo.cpu}
                    </div>
                  </div>
                </FuturisticCard>
              </div>

              {/* OS Card - Spans 5 columns */}
              <div className="col-span-12 lg:col-span-5">
                <FuturisticCard
                  icon="os"
                  title="OPERATING SYSTEM"
                  subtitle={systemInfo.os_name}
                >
                  <div className="mt-2">
                    <div className="text-base lg:text-lg text-white font-mono leading-relaxed">
                      {systemInfo.os_version}
                    </div>
                    <div className="text-xs text-orange-400/60 font-mono mt-1">
                      {systemInfo.architecture.toUpperCase()}
                    </div>
                  </div>
                </FuturisticCard>
              </div>

              {/* RAM Card with Progress */}
              <div className="col-span-12 md:col-span-6">
                <FuturisticCard
                  icon="ram"
                  title="MEMORY"
                  subtitle={`${systemInfo.ram_used} / ${systemInfo.ram_gb} USED`}
                >
                  <div className="mt-3">
                    <SystemProgressBar 
                      value={systemInfo.ram_percent} 
                      label={`${systemInfo.ram_percent}%`}
                      color="from-purple-500 to-pink-500"
                    />
                    <div className="flex justify-between mt-2 text-xs font-mono text-gray-500">
                      <span>0 GB</span>
                      <span>{systemInfo.ram_gb}</span>
                    </div>
                  </div>
                </FuturisticCard>
              </div>

              {/* Storage Card with Progress */}
              <div className="col-span-12 md:col-span-6">
                <FuturisticCard
                  icon="disk"
                  title="STORAGE"
                  subtitle={`${systemInfo.disk_used} / ${systemInfo.disk_total} USED`}
                >
                  <div className="mt-3">
                    <SystemProgressBar 
                      value={systemInfo.disk_percent} 
                      label={`${systemInfo.disk_percent}%`}
                      color="from-cyan-500 to-blue-500"
                    />
                    <div className="flex justify-between mt-2 text-xs font-mono text-gray-500">
                      <span>0 GB</span>
                      <span>{systemInfo.disk_total}</span>
                    </div>
                  </div>
                </FuturisticCard>
              </div>

              {/* GPU Card */}
              <div className="col-span-12">
                <FuturisticCard
                  icon="gpu"
                  title="GRAPHICS"
                  subtitle={systemInfo.gpu_memory}
                >
                  <div className="mt-2">
                    <div className="text-base lg:text-lg text-white font-mono break-words leading-relaxed">
                      {systemInfo.gpu}
                    </div>
                  </div>
                </FuturisticCard>
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-8 pt-4 border-t border-orange-500/10 flex flex-col sm:flex-row items-center justify-between text-xs font-mono gap-2">
              <div className="flex items-center gap-4">
                <StatusIndicator label="SYSTEM" status="online" />
                <StatusIndicator label="MONITOR" status="active" />
                {isUpdating && (
                  <span className="text-orange-400/60 animate-pulse">● SYNCING...</span>
                )}
              </div>
              <div className="text-orange-400/40 flex items-center gap-2">
                <span>TOOLS-33 v0.1.6</span>
                {lastUpdate && (
                  <span className="text-orange-400/30">| {getTimeSinceLastUpdate()}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <SystemErrorState />
        )}
      </div>

      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
