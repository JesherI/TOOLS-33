import { DetectedPlan } from "./types";

interface AutoPreviewGridProps {
  plans: DetectedPlan[];
  selectedPlans: Set<number>;
  onTogglePlan: (id: number) => void;
}

export function AutoPreviewGrid({ plans, selectedPlans, onTogglePlan }: AutoPreviewGridProps) {
  if (plans.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">
        Planos Detectados ({plans.length})
      </label>
      <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar pr-1">
        {plans.map((plan) => {
          const isSelected = selectedPlans.has(plan.id);
          const w = (plan.max_x - plan.min_x).toFixed(1);
          const h = (plan.max_y - plan.min_y).toFixed(1);
          return (
            <button
              key={plan.id}
              onClick={() => onTogglePlan(plan.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 ${
                isSelected
                  ? "bg-orange-500/15 border border-orange-500/30"
                  : "bg-white/5 border border-white/10 hover:border-white/30"
              }`}
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="peer sr-only"
                />
                <div className={`w-5 h-5 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                  isSelected
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-500"
                    : "bg-black/40 border-white/20"
                }`}>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 text-left">
                <span className={`text-sm font-medium ${isSelected ? "text-orange-400" : "text-gray-300"}`}>
                  {plan.label}
                </span>
                <span className="text-gray-500 text-xs ml-2">({w}×{h} u)</span>
              </div>
              <span className="text-[10px] text-gray-500">{plan.inner_entities.length} ent.</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
