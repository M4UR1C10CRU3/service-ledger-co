import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapAppearance } from "./lib/applyAppearance";

bootstrapAppearance();

createRoot(document.getElementById("root")!).render(<App />);
