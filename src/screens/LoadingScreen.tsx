import { ParticleCanvas } from "../components/particles";
import { CpuIcon } from "../components/icons";
import { ProgressBar } from "../components/progress";
import { CenteredLayout } from "../components/layout";
import { WindowControls } from "../components/window";
import { useProgress } from "../hooks";

interface LoadingScreenProps {
  onComplete?: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const { progress, isComplete } = useProgress({
    autoStart: true,
    incrementMin: 0.5,
    incrementMax: 2,
    interval: 50,
  });

  // Llamar onComplete cuando termine
  if (isComplete && onComplete) {
    onComplete();
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Title Bar - Draggable area with window controls */}
      <div
        className="absolute top-0 left-0 right-0 h-10 z-50 flex items-center justify-end px-4"
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

      {/* Center Content */}
      <CenteredLayout>
        {/* CPU Icon with Title */}
        <div className="relative flex flex-col items-center mb-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full scale-150" />
            <CpuIcon size={64} color="#f97316" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold text-orange-500 tracking-wider">
            TOOLS 33
          </h1>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          progress={progress}
          width="16rem"
          height="0.125rem"
          bgColor="bg-orange-500/20"
          fillColor="bg-orange-500"
          showPercentage={true}
        />
      </CenteredLayout>
    </div>
  );
}
