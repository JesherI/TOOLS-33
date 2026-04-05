import { LoadingScreen } from "./screens";

function App() {
  const handleLoadingComplete = () => {
    // Aquí puedes cambiar a otra pantalla
    console.log("Loading complete!");
  };

  return <LoadingScreen onComplete={handleLoadingComplete} />;
}

export default App;
