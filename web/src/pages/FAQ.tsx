import { createElement } from "inferno-create-element";
import { Card, CardContent } from "@/ui/Card";

// TODO: Port full FAQ accordion content from React version
export default function FAQ() {
  return createElement("div", { className: "space-y-8 animate-in" },
    createElement("h1", { className: "text-3xl font-bold tracking-tight" }, "Frequently Asked Questions"),
    createElement("p", { className: "text-muted-foreground" }, "Everything you need to know about running a Nostr relay."),
    createElement(Card, null,
      createElement(CardContent, { className: "p-6 text-sm text-muted-foreground" },
        "Full FAQ content is being ported to InfernoJS. Check back soon.",
      ),
    ),
  );
}
