import { createElement } from "inferno-create-element";
import { render } from "inferno";
import { BrowserRouter } from "inferno-router";
import { Toaster } from "@/ui/Toast";
import App from "./App";

render(
  createElement(BrowserRouter, null,
    createElement(App, null),
    createElement(Toaster, null),
  ),
  document.getElementById("root")!,
);
