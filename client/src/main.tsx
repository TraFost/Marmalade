import { createRoot } from "react-dom/client";

import { App } from "./app/layout/main.layout.tsx";

import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
