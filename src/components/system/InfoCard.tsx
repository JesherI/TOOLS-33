interface InfoCardProps {
  icon: "os" | "pc" | "cpu" | "ram" | "gpu";
  label: string;
  value: string;
  subvalue: string;
  className?: string;
}

const icons = {
  os: (
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  ),
  pc: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </>
  ),
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
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
};

export function InfoCard({ icon, label, value, subvalue, className = "" }: InfoCardProps) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-500/20 shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {icons[icon]}
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-sm text-gray-200 font-medium truncate" title={value}>
            {value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{subvalue}</p>
        </div>
      </div>
    </div>
  );
}
