import { createElement } from "inferno-create-element";
import { cn } from "@/ui/utils";

interface MushLogoProps {
  className?: string;
  glow?: boolean;
}

export function MushLogo({ className, glow = false }: MushLogoProps) {
  return createElement("div", { className: cn("relative inline-flex items-center justify-center", className) },
    glow
      ? createElement("div", {
          className: "absolute inset-0 rounded-full bg-primary/20 animate-mush-glow",
          "aria-hidden": "true",
        })
      : null,
    createElement("img", {
      src: "/favicon.svg",
      alt: "Mycelium",
      className: "relative size-full",
      draggable: false,
    }),
  );
}
