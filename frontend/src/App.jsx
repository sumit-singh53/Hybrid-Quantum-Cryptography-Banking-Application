import React from "react";
import ComprehensiveRoutes from "./routes/ComprehensiveRoutes";
import { ToastProvider } from "./context/ToastContext";

const App = () => {
  return (
    <ToastProvider>
      <ComprehensiveRoutes />
    </ToastProvider>
  );
};

export default App;
