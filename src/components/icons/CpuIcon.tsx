import { forwardRef } from "react";

interface CpuIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export const CpuIcon = forwardRef<SVGSVGElement, CpuIconProps>(
  ({ size = 64, color = "#f97316", strokeWidth = 1.5, className = "" }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="CPU Icon"
      >
        {/* CPU Core */}
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        {/* Pins top */}
        <path d="M9 2v2" />
        <path d="M12 2v2" />
        <path d="M15 2v2" />
        {/* Pins bottom */}
        <path d="M9 22v-2" />
        <path d="M12 22v-2" />
        <path d="M15 22v-2" />
        {/* Pins left */}
        <path d="M2 9h2" />
        <path d="M2 12h2" />
        <path d="M2 15h2" />
        {/* Pins right */}
        <path d="M22 9h-2" />
        <path d="M22 12h-2" />
        <path d="M22 15h-2" />
      </svg>
    );
  }
);

CpuIcon.displayName = "CpuIcon";
