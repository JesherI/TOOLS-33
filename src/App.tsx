import { useState } from "react";
import { LoadingScreen, ParticlesScreen } from "./screens";

function App() {
  const [showParticles, setShowParticles] = useState(false);

  const handleLoadingComplete = () => {
    setShowParticles(true);
  };

  if (showParticles) {
    return <ParticlesScreen />;
  }

  return <LoadingScreen onComplete={handleLoadingComplete} />;
}

export default App;
