interface DistributionInfoProps {
  blanks: number;
  total: number;
  hasBackCover: boolean;
}

export function DistributionInfo({ blanks, total, hasBackCover }: DistributionInfoProps) {
  const getDistributionText = () => {
    if (blanks === 2) {
      return hasBackCover 
        ? <span className="font-mono text-xs">2 blancos en pos 2 y {total - 1} → Spreads: 1-{total} color, 2-{total - 1} blanco</span>
        : <span className="font-mono text-xs">2 blancos en pos 2 y {total} → Spreads: 1-{total} blanco, 2-{total - 1} color</span>;
    }
    if (blanks === 3) {
      return hasBackCover
        ? <span className="font-mono text-xs">3 blancos en pos 2, {total - 2}, {total - 1} → Spreads: 1-{total} color, 2-{total - 1} blanco, {total - 2} blanco</span>
        : <span className="font-mono text-xs">3 blancos en pos 2, {total - 1}, {total} → Spreads: 1-{total} blanco, 2-{total - 1} blanco, {total - 2} color</span>;
    }
    if (blanks === 1) {
      return <span className="font-mono text-xs">1 blanco en pos {total}. Última imagen en pos {total - 1}.</span>;
    }
    return <span className="font-mono text-xs">Blancos distribuidos desde posición 2.</span>;
  };

  return (
    <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
      <p className="text-sm text-gray-300">
        <span className="text-orange-400 font-semibold">Distribución:</span>{" "}
        {getDistributionText()}
      </p>
    </div>
  );
}
