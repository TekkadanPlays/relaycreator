import { createElement } from "inferno-create-element";
import { Card, CardContent } from "@/ui/Card";

// TODO: Port full admin panel (2468 lines) from React version
export default function Admin() {
  return createElement("div", { className: "space-y-6 animate-in" },
    createElement("h1", { className: "text-3xl font-bold tracking-tight" }, "Admin Panel"),
    createElement(Card, null,
      createElement(CardContent, { className: "p-6 text-sm text-muted-foreground" },
        "Admin panel is being ported to InfernoJS. Check back soon.",
      ),
    ),
  );
}
