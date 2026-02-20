import { createElement } from "inferno-create-element";
import { render } from "inferno";
import { BrowserRouter } from "inferno-router";
import { initTheme } from "@/stores/theme";
import App from "./App";

// Apply persisted theme (dark mode + base color) before first paint
initTheme();

render(
  createElement(BrowserRouter, null,
    createElement(App, null),
  ),
  document.getElementById("root")!,
);
