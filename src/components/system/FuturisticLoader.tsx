export function FuturisticLoader() {
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
