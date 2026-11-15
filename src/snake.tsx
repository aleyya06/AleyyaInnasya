import { createRoot } from "react-dom/client";
import { SnakePage } from "./SnakePage";
import "./styles/global.css";

const container = document.getElementById("root");
if (container) createRoot(container).render(<SnakePage />);
