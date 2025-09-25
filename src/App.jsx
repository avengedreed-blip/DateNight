import React, { useCallback, useState } from "react";
import Wheel from "./components/Wheel";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import "./styles/layout.css";

function App() {
  const [extremeOnly, setExtremeOnly] = useState(false);

  const handleToggleMode = useCallback(() => {
    setExtremeOnly((previous) => !previous);
  }, []);

  const handleOpenThemes = useCallback(() => {}, []);
  const handleOpenHelp = useCallback(() => {}, []);
  const handleOpenSettings = useCallback(() => {}, []);

  return (
    <div className="app-shell">
      <TopBar onOpenSettings={handleOpenSettings} />
      <main className="app-main" role="main">
        <div className="wheel-stage">
          <div className="wheel-container">
            <Wheel extremeOnly={extremeOnly} />
          </div>
        </div>
      </main>
      <BottomNav
        extremeOnly={extremeOnly}
        onToggleMode={handleToggleMode}
        onOpenThemes={handleOpenThemes}
        onOpenHelp={handleOpenHelp}
      />
    </div>
  );
}

export default App;
