import { createElement } from "inferno-create-element";
import { Card, CardContent } from "@/ui/Card";

// TODO: Port full invoices page from React version
export default function Invoices() {
  return createElement("div", { className: "space-y-6 animate-in" },
    createElement("h1", { className: "text-3xl font-bold tracking-tight" }, "Invoices"),
    createElement(Card, null,
      createElement(CardContent, { className: "p-6 text-sm text-muted-foreground" },
        "Invoices page is being ported to InfernoJS. Check back soon.",
      ),
    ),
  );
}
