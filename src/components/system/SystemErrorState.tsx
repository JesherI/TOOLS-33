export function SystemErrorState() {
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
