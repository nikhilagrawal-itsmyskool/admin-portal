import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import App from "./App";
import theme from "./theme";
import { AuthProvider } from "./context/AuthContext";
import "./print.css";

// Capture the PWA install prompt as early as possible — it can fire before React mounts
// and won't necessarily fire again. InstallButton reads window.deferredInstallPrompt and
// listens for these custom events.
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.deferredInstallPrompt = e;
  window.dispatchEvent(new Event("pwa:installable"));
});
window.addEventListener("appinstalled", () => {
  window.deferredInstallPrompt = null;
  window.dispatchEvent(new Event("pwa:installed"));
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
