interface StatusIndicatorProps {
  label: string;
  status: "online" | "offline" | "active" | "warning";
}

const colors = {
  online: "bg-green-500",
  offline: "bg-red-500",
  active: "bg-orange-500",
  warning: "bg-yellow-500",
};

export function StatusIndicator({ label, status }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 ${colors[status]} rounded-full animate-pulse`} />
      <span className="text-orange-400/60">{label}</span>
    </div>
  );
}
