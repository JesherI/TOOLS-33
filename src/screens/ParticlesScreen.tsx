import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";
import { Sidebar } from "../components/sidebar";

interface ParticlesScreenProps {
  onNavigate?: (screen: "home" | "pdf-compress") => void;
}

export function ParticlesScreen({ onNavigate }: ParticlesScreenProps) {
  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        currentScreen="home"
        onNavigate={onNavigate}
      />

      {/* Window Controls - Top right */}
      <div
        className="absolute top-4 right-4 z-50"
        data-tauri-drag-region
      >
        <WindowControls />
      </div>

      {/* Particles Background */}
      <ParticleCanvas
        config={{
          connectionDistance: 120,
          mouseInfluenceRadius: 300,
          mouseInfluenceStrength: 0.03,
          returnSpeed: 0.05,
          colors: {
            particle: "#f97316",
            connection: "rgba(249, 115, 22,",
          },
        }}
        density={15000}
      />
    </div>
  );
}
