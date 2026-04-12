import { useState } from "react";
import { CpuIcon } from "../icons";
import { downloadAndInstall } from "../../utils/updater";

interface SidebarProps {
  className?: string;
  currentScreen?: "home" | "pdf-compress";
  onNavigate?: (screen: "home" | "pdf-compress") => void;
}

export function Sidebar({ 
  className = "", 
  currentScreen = "home",
  onNavigate 
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState(currentScreen);

  const handleNavigation = (screen: "home" | "pdf-compress") => {
    setActiveItem(screen);
    onNavigate?.(screen);
  };

  return (
    <div
      className={`absolute left-0 top-0 h-full z-40 ${className}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Sidebar Container */}
      <div
        className={`h-full transition-all duration-300 ease-out overflow-hidden ${
          isExpanded ? "w-64" : "w-16"
        }`}
        style={{
          background: "rgba(10, 10, 10, 0.7)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Logo Section */}
        <div className={`p-4 flex items-center gap-3 ${isExpanded ? "justify-start" : "justify-center"}`}>
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <CpuIcon size={28} color="#f97316" strokeWidth={1.5} />
          </div>
          {isExpanded && (
            <div className="flex flex-col">
              <span className="text-orange-500 font-semibold text-sm">TOOLS 33</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/10" />

        {/* Menu Items */}
        <div className="p-2 space-y-1">
          {/* Home */}
          <button
            onClick={() => handleNavigation("home")}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
              activeItem === "home"
                ? "text-orange-400"
                : "text-gray-400 hover:text-gray-200"
            } ${isExpanded ? "justify-start" : "justify-center"}`}
            style={{
              background: activeItem === "home" ? "rgba(249, 115, 22, 0.15)" : "transparent",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {isExpanded && (
              <span className="text-sm font-medium whitespace-nowrap">Home</span>
            )}
          </button>

          {/* PDF Compress */}
          <button
            onClick={() => handleNavigation("pdf-compress")}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
              activeItem === "pdf-compress"
                ? "text-orange-400"
                : "text-gray-400 hover:text-gray-200"
            } ${isExpanded ? "justify-start" : "justify-center"}`}
            style={{
              background: activeItem === "pdf-compress" ? "rgba(249, 115, 22, 0.15)" : "transparent",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M8 14v-4" />
              <path d="M12 14v-4" />
              <path d="M16 14v-4" />
            </svg>
            {isExpanded && (
              <span className="text-sm font-medium whitespace-nowrap">PDF Compress</span>
            )}
          </button>
        </div>

        {/* Bottom Section */}
        <div className="absolute bottom-4 left-2 right-2">
          {/* Divider */}
          <div className="mx-2 mb-2 h-px bg-white/10" />
          
          {/* Update Check */}
          <button
            onClick={() => downloadAndInstall()}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group text-gray-500 hover:text-gray-300 hover:bg-white/5 ${
              isExpanded ? "justify-start" : "justify-center"
            }`}
            title="Buscar actualizaciones"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            {isExpanded && (
              <span className="text-xs font-medium whitespace-nowrap">Buscar actualizaciones</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
