import { useState, useEffect } from "react";
import { CpuIcon } from "../icons";
import { getVersion } from "@tauri-apps/api/app";

interface SidebarProps {
  className?: string;
  currentScreen?: "home" | "pdf-compress" | "magazine" | "image-scaler" | "texture-generator";
  onNavigate?: (screen: "home" | "pdf-compress" | "magazine" | "image-scaler" | "texture-generator") => void;
}

export function Sidebar({ 
  className = "", 
  currentScreen = "home",
  onNavigate 
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState(currentScreen);
  const [appVersion, setAppVersion] = useState<string>("");

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("0.2.4"));
  }, []);

  const handleNavigation = (screen: "home" | "pdf-compress" | "magazine" | "image-scaler" | "texture-generator") => {
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

          {/* Magazine Builder */}
          <button
            onClick={() => handleNavigation("magazine")}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
              activeItem === "magazine"
                ? "text-orange-400"
                : "text-gray-400 hover:text-gray-200"
            } ${isExpanded ? "justify-start" : "justify-center"}`}
            style={{
              background: activeItem === "magazine" ? "rgba(249, 115, 22, 0.15)" : "transparent",
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
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            {isExpanded && (
              <span className="text-sm font-medium whitespace-nowrap">Magazine</span>
            )}
          </button>

          {/* Image Scaler */}
          <button
            onClick={() => handleNavigation("image-scaler")}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
              activeItem === "image-scaler"
                ? "text-orange-400"
                : "text-gray-400 hover:text-gray-200"
            } ${isExpanded ? "justify-start" : "justify-center"}`}
            style={{
              background: activeItem === "image-scaler" ? "rgba(249, 115, 22, 0.15)" : "transparent",
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
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {isExpanded && (
              <span className="text-sm font-medium whitespace-nowrap">Image Scaler</span>
            )}
          </button>

          {/* Texture Generator */}
          <button
            onClick={() => handleNavigation("texture-generator")}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
              activeItem === "texture-generator"
                ? "text-orange-400"
                : "text-gray-400 hover:text-gray-200"
            } ${isExpanded ? "justify-start" : "justify-center"}`}
            style={{
              background: activeItem === "texture-generator" ? "rgba(249, 115, 22, 0.15)" : "transparent",
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
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M3 9h18M9 21V9" />
              <circle cx="12" cy="6" r="1" fill="currentColor" />
              <circle cx="6" cy="6" r="1" fill="currentColor" />
              <circle cx="18" cy="6" r="1" fill="currentColor" />
            </svg>
            {isExpanded && (
              <span className="text-sm font-medium whitespace-nowrap">Textures</span>
            )}
          </button>
        </div>

        {/* Footer - Version */}
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <div className={`flex items-center gap-2 text-[10px] text-gray-600 transition-all duration-300 ${
            isExpanded ? "justify-start" : "justify-center"
          }`}>
            <span className="font-medium">v{appVersion || "0.2.4"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
