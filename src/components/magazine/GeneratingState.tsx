export function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-2 border-orange-500/20 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-2 border-2 border-orange-500/40 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
        <div className="absolute inset-4 border-2 border-orange-500/60 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
        </div>
      </div>
      <p className="text-orange-400 font-mono text-sm tracking-wider animate-pulse">
        GENERANDO PDF...
      </p>
    </div>
  );
}
