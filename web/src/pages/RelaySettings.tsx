import { createElement } from "inferno-create-element";

import { Card, CardContent } from "@/ui/Card";



// TODO: Port full relay settings page (931 lines) from React version

export default function RelaySettings() {

  return createElement("div", { className: "space-y-6 animate-in" },

    createElement("h1", { className: "text-3xl font-bold tracking-tight" }, "Relay Settings"),

    createElement(Card, null,

      createElement(CardContent, { className: "p-6 text-sm text-muted-foreground" },

        "Relay settings are being ported to InfernoJS. Check back soon.",

      ),

    ),

  );

}

