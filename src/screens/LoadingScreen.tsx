import { useEffect, useState } from "react";
import { ParticleCanvas } from "../components/particles";
import { CpuIcon } from "../components/icons";
import { ProgressBar } from "../components/progress";
import { CenteredLayout } from "../components/layout";
import { WindowControls } from "../components/window";
import { UpdateDialog } from "../components/update";
import { useProgress } from "../hooks";
import { checkForUpdate, UpdateInfo } from "../utils/updater";

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

  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);

  useEffect(() => {
    const checkUpdate = async () => {
      setCheckingUpdate(true);
      try {
        const info = await checkForUpdate();
        setUpdateInfo(info);
      } catch (error) {
        console.error("Error checking for updates:", error);
      } finally {
        setCheckingUpdate(false);
      }
    };

    checkUpdate();
  }, []);

  useEffect(() => {
    if (isComplete) {
      setLoadingComplete(true);
      const timer = setTimeout(() => {
        if (!updateInfo?.available) {
          onComplete?.();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onComplete, updateInfo?.available]);

  const handleUpdateClose = () => {
    setUpdateInfo(null);
    onComplete?.();
  };

  const showUpdateDialog = loadingComplete && updateInfo?.available;

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

        {/* Checking for updates indicator */}
        {checkingUpdate && (
          <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Buscando actualizaciones...</span>
          </div>
        )}
      </CenteredLayout>

      {/* Update Dialog */}
      {showUpdateDialog && updateInfo && (
        <UpdateDialog
          version={updateInfo.version || ""}
          releaseNotes={updateInfo.body}
          onClose={handleUpdateClose}
        />
      )}
    </div>
  );
}
