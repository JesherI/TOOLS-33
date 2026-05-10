import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingScreen, ParticlesScreen, PdfCompressScreen, PdfMergeScreen, MagazineScreen, ImageScalerScreen, TextureGeneratorScreen, CadScannerScreen } from "./screens";
import { Sidebar } from "./components/sidebar";
import { WindowControls } from "./components/window";

type Screen = "loading" | "home" | "pdf-compress" | "pdf-merge" | "magazine" | "image-scaler" | "texture-generator" | "cad-scanner";

// Variantes de animación para las transiciones de pantalla
const pageVariants = {
  initial: {
    opacity: 0,
    x: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    x: -20,
    scale: 0.98,
  },
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("loading");

  const handleLoadingComplete = () => {
    setCurrentScreen("home");
  };

  const handleNavigate = (screen: "home" | "pdf-compress" | "pdf-merge" | "magazine" | "image-scaler" | "texture-generator" | "cad-scanner") => {
    setCurrentScreen(screen);
  };

  const getActiveScreen = (): "home" | "pdf-compress" | "pdf-merge" | "magazine" | "image-scaler" | "texture-generator" | "cad-scanner" => {
    if (currentScreen === "loading") return "home";
    return currentScreen;
  };

  // Renderizar el contenido de la pantalla actual sin el sidebar
  const renderScreenContent = () => {
    switch (currentScreen) {
      case "loading":
        return <LoadingScreen onComplete={handleLoadingComplete} />;
      case "home":
        return <ParticlesScreen onNavigate={handleNavigate} />;
      case "pdf-compress":
        return <PdfCompressScreen onNavigate={handleNavigate} />;
      case "pdf-merge":
        return <PdfMergeScreen onNavigate={handleNavigate} />;
      case "magazine":
        return <MagazineScreen onNavigate={handleNavigate} />;
      case "image-scaler":
        return <ImageScalerScreen onNavigate={handleNavigate} />;
      case "texture-generator":
        return <TextureGeneratorScreen onNavigate={handleNavigate} />;
      case "cad-scanner":
        return <CadScannerScreen onNavigate={handleNavigate} />;
      default:
        return <LoadingScreen onComplete={handleLoadingComplete} />;
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Window Controls - SIEMPRE visibles, nunca animados */}
      <div className="absolute top-4 right-4 z-[100]" data-tauri-drag-region>
        <WindowControls />
      </div>

      {/* Sidebar persistente - siempre visible excepto en loading */}
      <AnimatePresence>
        {currentScreen !== "loading" && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute left-0 top-0 h-full z-50"
          >
            <Sidebar
              currentScreen={getActiveScreen()}
              onNavigate={handleNavigate}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido de la pantalla con animaciones */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          variants={pageVariants}
          initial="initial"
          animate="in"
          exit="out"
          transition={pageTransition}
          className="w-full h-full"
        >
          {renderScreenContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default App;
