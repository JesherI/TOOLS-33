import { useState } from "react";
import { LoadingScreen, ParticlesScreen, PdfCompressScreen, MagazineScreen } from "./screens";

type Screen = "loading" | "home" | "pdf-compress" | "magazine";

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("loading");

  const handleLoadingComplete = () => {
    setCurrentScreen("home");
  };

  const handleNavigate = (screen: "home" | "pdf-compress" | "magazine") => {
    setCurrentScreen(screen);
  };

  switch (currentScreen) {
    case "loading":
      return <LoadingScreen onComplete={handleLoadingComplete} />;
    case "home":
      return <ParticlesScreen onNavigate={handleNavigate} />;
    case "pdf-compress":
      return <PdfCompressScreen onNavigate={handleNavigate} />;
    case "magazine":
      return <MagazineScreen onNavigate={handleNavigate} />;
    default:
      return <LoadingScreen onComplete={handleLoadingComplete} />;
  }
}

export default App;
