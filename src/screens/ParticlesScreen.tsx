import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";
import { Sidebar } from "../components/sidebar";

interface ParticlesScreenProps {
  onNavigate?: (screen: "home" | "pdf-compress") => void;
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

export function ParticlesScreen({ onNavigate }: ParticlesScreenProps) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchSystemInfo = useCallback(async () => {
    try {
      const info = await invoke<SystemInfo>("get_system_info");
      setSystemInfo(info);
      setLoading(false);
    } catch (error) {
      console.error("Error obteniendo info del sistema:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemInfo();
    
    // Actualizar cada 3 segundos
    const interval = setInterval(fetchSystemInfo, 3000);
    
    // Actualizar reloj
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, [fetchSystemInfo]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        currentScreen="home"
        onNavigate={onNavigate}
      />

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
      <div className="absolute inset-0 flex items-center justify-center z-10 pl-24 pr-8 py-8">
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
                    <ProgressBar 
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
                    <ProgressBar 
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
              </div>
              <div className="text-orange-400/40">
                TOOLS-33 v0.1.6 // SYSINFO MODULE ACTIVE
              </div>
            </div>
          </div>
        ) : (
          <ErrorState />
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

// Futuristic Card Component
interface FuturisticCardProps {
  icon: "cpu" | "ram" | "gpu" | "disk" | "os";
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function FuturisticCard({ icon, title, subtitle, children }: FuturisticCardProps) {
  const icons = {
    cpu: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
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
    disk: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="2" x2="12" y2="5" />
      </>
    ),
    os: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </>
    ),
  };

  return (
    <div className="group relative">
      {/* Glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      
      <div className="relative bg-black/60 backdrop-blur-xl border border-orange-500/20 rounded-xl p-5 overflow-hidden">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-orange-500/50 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-orange-500/50 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-orange-500/50 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-orange-500/50 rounded-br-lg" />
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-orange-600/5 rounded-lg flex items-center justify-center border border-orange-500/30">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f97316"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {icons[icon]}
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-orange-500 tracking-widest">{title}</h3>
            <p className="text-[10px] text-orange-400/60 font-mono">{subtitle}</p>
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Background grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(249, 115, 22, 0.5) 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
      </div>
    </div>
  );
}

// Progress Bar Component
interface ProgressBarProps {
  value: number;
  label: string;
  color?: string;
}

function ProgressBar({ value, label, color = "from-orange-500 to-red-500" }: ProgressBarProps) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-orange-400/80">UTILIZATION</span>
        <span className="text-lg font-mono font-bold text-white">{label}</span>
      </div>
      <div className="relative h-3 bg-gray-800/80 rounded-full overflow-hidden">
        {/* Background pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 11px)`,
          }}
        />
        {/* Progress fill */}
        <div 
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${Math.min(value, 100)}%` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
        {/* Glow */}
        <div 
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full blur-md opacity-50 transition-all duration-1000`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

// Status Indicator
function StatusIndicator({ label, status }: { label: string; status: "online" | "offline" | "active" | "warning" }) {
  const colors = {
    online: "bg-green-500",
    offline: "bg-red-500",
    active: "bg-orange-500",
    warning: "bg-yellow-500",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 ${colors[status]} rounded-full animate-pulse`} />
      <span className="text-orange-400/60">{label}</span>
    </div>
  );
}

// Futuristic Loader
function FuturisticLoader() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-24 h-24">
        {/* Outer ring */}
        <div className="absolute inset-0 border-2 border-orange-500/20 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
        {/* Middle ring */}
        <div className="absolute inset-2 border-2 border-orange-500/40 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
        {/* Inner ring */}
        <div className="absolute inset-4 border-2 border-orange-500/60 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
        </div>
      </div>
      <p className="mt-6 text-orange-400 font-mono text-sm tracking-wider animate-pulse">
        INITIALIZING SYSTEM...
      </p>
    </div>
  );
}

// Error State
function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/30 mb-4">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ef4444"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-red-400 mb-2">SYSTEM ERROR</h3>
      <p className="text-gray-400 font-mono text-sm">
        Unable to retrieve system information
      </p>
    </div>
  );
}
