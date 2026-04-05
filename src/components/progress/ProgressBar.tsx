import { forwardRef } from "react";

interface ProgressBarProps {
  progress: number;
  maxValue?: number;
  width?: string;
  height?: string;
  bgColor?: string;
  fillColor?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      progress,
      maxValue = 100,
      width = "16rem",
      height = "0.125rem",
      bgColor = "bg-orange-500/20",
      fillColor = "bg-orange-500",
      showPercentage = true,
      className = "",
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((progress / maxValue) * 100, 0), 100);

    return (
      <div ref={ref} className={`flex flex-col items-center ${className}`}>
        <div
          className={`w-full ${bgColor} rounded-full overflow-hidden`}
          style={{ width, height }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full ${fillColor} transition-all duration-100 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showPercentage && (
          <div className="mt-4 text-orange-500/80 text-sm font-mono">
            {Math.floor(percentage)}%
          </div>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";
