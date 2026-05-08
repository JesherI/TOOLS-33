import type { ReactNode } from "react";

interface FuturisticCardProps {
  icon: "cpu" | "ram" | "gpu" | "disk" | "os";
  title: string;
  subtitle: string;
  children: ReactNode;
}

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

export function FuturisticCard({ icon, title, subtitle, children }: FuturisticCardProps) {
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
