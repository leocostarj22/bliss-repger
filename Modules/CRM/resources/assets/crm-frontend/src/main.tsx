import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("!!! APP INICIADO - VERSÃO COM DEBUG !!!");

createRoot(document.getElementById("root")!).render(<App />);
