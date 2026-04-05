import { ReactNode } from "react";

interface CenteredLayoutProps {
  children: ReactNode;
  className?: string;
  verticalCenter?: boolean;
  horizontalCenter?: boolean;
}

export function CenteredLayout({
  children,
  className = "",
  verticalCenter = true,
  horizontalCenter = true,
}: CenteredLayoutProps) {
  const verticalClasses = verticalCenter ? "items-center" : "";
  const horizontalClasses = horizontalCenter ? "justify-center" : "";

  return (
    <div
      className={`absolute inset-0 flex flex-col ${verticalClasses} ${horizontalClasses} ${className}`}
    >
      {children}
    </div>
  );
}
