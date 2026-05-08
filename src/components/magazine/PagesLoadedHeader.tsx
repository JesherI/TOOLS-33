interface Stats {
  total: number;
  realImages: number;
  blanks: number;
}

interface PagesLoadedHeaderProps {
  stats: Stats;
}

export function PagesLoadedHeader({ stats }: PagesLoadedHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold text-orange-400">Páginas cargadas</h3>
        <span className="px-2 py-1 bg-orange-500/20 rounded-md text-xs text-orange-400 font-mono">
          {stats.realImages} imgs + {stats.blanks} blancos = {stats.total} total
        </span>
      </div>
    </div>
  );
}
