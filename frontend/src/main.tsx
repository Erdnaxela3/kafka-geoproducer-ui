import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { SettingsProvider } from "./context/SettingsContext.tsx";
import { ProducersListProvider } from "./context/ProducersListContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <ProducersListProvider>
          <App />
        </ProducersListProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>
);
