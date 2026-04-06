import { ParticleCanvas } from "../components/particles";
import { WindowControls } from "../components/window";

export function ParticlesScreen() {
  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Window Controls - Top right */}
      <div
        className="absolute top-4 right-4 z-50"
        data-tauri-drag-region
      >
        <WindowControls />
      </div>

      {/* Particles Background Only */}
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
