import { useState } from "react";
import { LoadingScreen, ParticlesScreen, PdfCompressScreen } from "./screens";

type Screen = "loading" | "home" | "pdf-compress";

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("loading");

  const handleLoadingComplete = () => {
    setCurrentScreen("home");
  };

  const handleNavigate = (screen: "home" | "pdf-compress") => {
    setCurrentScreen(screen);
  };

  switch (currentScreen) {
    case "loading":
      return <LoadingScreen onComplete={handleLoadingComplete} />;
    case "home":
      return <ParticlesScreen onNavigate={handleNavigate} />;
    case "pdf-compress":
      return <PdfCompressScreen onNavigate={handleNavigate} />;
    default:
      return <LoadingScreen onComplete={handleLoadingComplete} />;
  }
}

export default App;
