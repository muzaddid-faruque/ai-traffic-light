import React from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import CameraView from "./components/CameraView";

function App() {
  return (
    <ErrorBoundary>
      <CameraView />
    </ErrorBoundary>
  );
}

export default App;
