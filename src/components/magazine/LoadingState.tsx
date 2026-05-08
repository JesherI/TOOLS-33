interface LoadingStateProps {
  current: number;
  total: number;
}

export function LoadingState({ current, total }: LoadingStateProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/30">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-orange-400">
          Cargando imágenes... {current} / {total}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-orange-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
