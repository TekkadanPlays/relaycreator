import { createElement } from "inferno-create-element";
import { Card, CardContent } from "@/ui/Card";

// TODO: Port full wallet page (527 lines + 12 sub-components) from React version
export default function Wallet() {
  return createElement("div", { className: "space-y-6 animate-in" },
    createElement("h1", { className: "text-3xl font-bold tracking-tight" }, "Wallet"),
    createElement(Card, null,
      createElement(CardContent, { className: "p-6 text-sm text-muted-foreground" },
        "Wallet is being ported to InfernoJS. Check back soon.",
      ),
    ),
  );
}
