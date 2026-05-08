interface SystemProgressBarProps {
  value: number;
  label: string;
  color?: string;
}

export function SystemProgressBar({ value, label, color = "from-orange-500 to-red-500" }: SystemProgressBarProps) {
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
