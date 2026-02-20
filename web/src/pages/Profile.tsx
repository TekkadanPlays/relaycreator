import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { authStore, type User } from "../stores/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/ui/Avatar";
import { Card, CardContent } from "@/ui/Card";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Separator } from "@/ui/Separator";
import { User as UserIcon, Shield, Radio, Copy, CheckCircle2, ExternalLink } from "@/lib/icons";
import { cn } from "@/ui/utils";

interface ProfileState {
  user: User | null;
  copied: boolean;
}

export default class Profile extends Component<{}, ProfileState> {
  declare state: ProfileState;
  private unsub: (() => void) | null = null;

  constructor(props: {}) {
    super(props);
    this.state = { user: authStore.get().user, copied: false };
  }

  componentDidMount() {
    this.unsub = authStore.subscribe((s) => this.setState({ user: s.user }));
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  private copyPubkey = () => {
    const { user } = this.state;
    if (!user) return;
    navigator.clipboard.writeText(user.pubkey).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    const { user, copied } = this.state;

    if (!user) {
      return createElement("div", { className: "flex items-center justify-center min-h-[60vh]" },
        createElement("div", { className: "text-center space-y-3" },
          createElement(UserIcon, { className: "size-12 text-muted-foreground mx-auto" }),
          createElement("h2", { className: "text-lg font-semibold" }, "Not signed in"),
          createElement("p", { className: "text-sm text-muted-foreground" }, "Sign in with a NIP-07 extension to view your profile."),
        ),
      );
    }

    const npubShort = user.pubkey.slice(0, 12) + "..." + user.pubkey.slice(-8);

    return createElement("div", { className: "max-w-2xl mx-auto space-y-6 animate-in" },

      // Banner + avatar card
      createElement(Card, { className: "overflow-hidden border-border/50" },
        // Banner
        createElement("div", {
          className: "h-32 sm:h-40 bg-gradient-to-br from-primary/30 via-primary/10 to-muted/50",
          style: user.banner ? { backgroundImage: `url(${user.banner})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined,
        }),
        createElement(CardContent, { className: "relative pt-0 pb-6 px-6" },
          // Avatar
          createElement("div", { className: "-mt-10 mb-4" },
            createElement(Avatar, { className: "size-20 ring-4 ring-card" },
              user.picture
                ? createElement(AvatarImage, { src: user.picture, alt: user.name || "Profile" })
                : null,
              createElement(AvatarFallback, { className: "text-xl font-bold" },
                user.pubkey.slice(0, 2).toUpperCase(),
              ),
            ),
          ),
          // Name + badges
          createElement("div", { className: "flex items-center gap-2 flex-wrap" },
            createElement("h1", { className: "text-xl font-bold" }, user.name || npubShort),
            user.admin ? createElement(Badge, { className: "text-[10px] bg-primary/10 text-primary border-primary/20" }, "Admin") : null,
          ),
          // Pubkey
          createElement("div", { className: "flex items-center gap-2 mt-2" },
            createElement("code", { className: "text-xs text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1 truncate max-w-[300px]" }, npubShort),
            createElement("button", {
              onClick: this.copyPubkey,
              className: "rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer",
              title: "Copy pubkey",
            },
              copied
                ? createElement(CheckCircle2, { className: "size-3.5 text-emerald-400" })
                : createElement(Copy, { className: "size-3.5" }),
            ),
          ),
          // About
          user.about ? createElement("p", { className: "text-sm text-muted-foreground mt-3 leading-relaxed" }, user.about) : null,
        ),
      ),

      // Quick links
      createElement(Card, { className: "border-border/50" },
        createElement(CardContent, { className: "p-4 space-y-1" },
          createElement("h3", { className: "text-sm font-semibold mb-3" }, "Quick Links"),
          createElement("a", {
            href: `https://njump.me/${user.pubkey}`,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
          },
            createElement(ExternalLink, { className: "size-4" }),
            "View on njump.me",
          ),
          createElement("a", {
            href: `https://primal.net/p/${user.pubkey}`,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
          },
            createElement(ExternalLink, { className: "size-4" }),
            "View on Primal",
          ),
        ),
      ),
    );
  }
}
