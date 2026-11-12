import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/pwa";

// A failed email link (expired, already used, or replaced by a newer email) comes back as
// #error=...&error_code=otp_expired. Keep it for the sign-in screen before routing drops the hash.
try {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const code = params.get("error_code");
  if (code) {
    sessionStorage.setItem("authLinkError", code);
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
} catch { /* storage unavailable: the sign-in screen just won't explain the failed link */ }

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker (no-op in iframe/preview)
registerServiceWorker();
