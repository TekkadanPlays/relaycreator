import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { authStore, login, logout, type AuthState } from "../stores/auth";
import { api } from "../lib/api";
import { Button } from "@/ui/Button";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/Avatar";
import { Separator } from "@/ui/Separator";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/ui/DropdownMenu";
import { Sheet, SheetContent } from "@/ui/Sheet";
import {
  Radio, LogOut, Menu, Zap, Globe, User, Loader2, X,
  HelpCircle, Github, Wallet, Shield, Play,
} from "@/lib/icons";
import { cn } from "@/ui/utils";

interface LayoutProps {
  children?: any;
}

interface LayoutState extends AuthState {
  loginError: string;
  mobileOpen: boolean;
  panelTier: "admin" | "operator" | "demo";
  panelLabel: string;
}

export default class Layout extends Component<LayoutProps, LayoutState> {
  declare state: LayoutState;
  private unsub: (() => void) | null = null;

  constructor(props: LayoutProps) {
    super(props);
    const auth = authStore.get();
    this.state = {
      ...auth,
      loginError: "",
      mobileOpen: false,
      panelTier: "demo",
      panelLabel: "Live Demo",
    };
  }

  componentDidMount() {
    this.unsub = authStore.subscribe((s) => {
      this.setState(s as any);
      this.updatePanelTier(s);
    });
    this.updatePanelTier(authStore.get());
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  private async updatePanelTier(auth: AuthState) {
    if (auth.user?.admin) {
      this.setState({ panelTier: "admin", panelLabel: "Admin Panel" });
      return;
    }
    if (auth.user) {
      try {
        const data = await api.get<{ myRelays: any[]; moderatedRelays: any[] }>("/relays/mine");
        const hasRelays = (data?.myRelays?.length ?? 0) > 0 || (data?.moderatedRelays?.length ?? 0) > 0;
        if (hasRelays) {
          this.setState({ panelTier: "operator", panelLabel: "My Relays" });
          return;
        }
      } catch { /* ignore */ }
    }
    this.setState({ panelTier: "demo", panelLabel: "Live Demo" });
  }

  private handleLogin = async () => {
    try {
      this.setState({ loginError: "" });
      await login();
    } catch (err: any) {
      this.setState({ loginError: err.message || "Login failed" });
    }
  };

  private handleLogout = () => {
    logout();
    this.setState({ mobileOpen: false });
  };

  render() {
    const { user, loading, loginError, mobileOpen, panelTier, panelLabel } = this.state;
    const { children } = this.props;
    const PanelIcon = panelTier === "admin" ? Shield : panelTier === "operator" ? Zap : Play;

    return createElement("div", { className: "min-h-screen bg-background flex flex-col" },

      // Header
      createElement("header", { className: "sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl backdrop-saturate-150" },
        createElement("div", { className: "mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6" },

          // Logo
          createElement(Link, { to: "/", className: "flex items-center gap-2.5 group shrink-0" },
            createElement("div", { className: "flex items-center justify-center size-8 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors" },
              createElement(Radio, { className: "size-4 text-primary" }),
            ),
            createElement("span", { className: "text-lg font-bold tracking-tight" }, "relay.tools"),
          ),

          // Center nav dropdown (desktop)
          createElement("nav", { className: "hidden sm:flex items-center" },
            createElement(DropdownMenu, null,
              createElement(DropdownMenuTrigger, null,
                createElement(Button, { variant: "ghost", size: "sm", className: "gap-1.5 text-sm font-medium" },
                  createElement(Globe, { className: "size-4" }), "Explore",
                ),
              ),
              createElement(DropdownMenuContent, { className: "w-48" },
                createElement(DropdownMenuItem, { onClick: () => { window.location.href = "/directory"; } },
                  createElement(Radio, { className: "size-4" }), " Directory",
                ),
                createElement(DropdownMenuSeparator, null),
                createElement(DropdownMenuItem, { onClick: () => { window.location.href = "https://app.mycelium.social"; } },
                  createElement(User, { className: "size-4" }), " Social",
                ),
                createElement(DropdownMenuItem, { onClick: () => { window.location.href = "https://chat.mycelium.social"; } },
                  createElement(Zap, { className: "size-4" }), " Chat",
                ),
              ),
            ),
          ),

          // Right side
          createElement("div", { className: "flex items-center gap-2" },

            // Panel button (desktop)
            createElement(Link, { to: "/admin", className: cn("gap-1.5 hidden sm:inline-flex", "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-8 px-3 cursor-pointer transition-all", panelTier === "admin" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-2 border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground") },
              createElement(PanelIcon, { className: "size-4" }),
              panelLabel,
            ),

            // Auth section
            loading
              ? createElement(Loader2, { className: "size-4 animate-spin text-muted-foreground" })
              : user
                ? createElement(DropdownMenu, null,
                    createElement(DropdownMenuTrigger, null,
                      createElement(Button, { variant: "ghost", size: "icon", className: "rounded-full" },
                        createElement(Avatar, { className: "size-8" },
                          createElement(AvatarFallback, { className: "bg-primary/10 text-primary text-xs font-medium" },
                            user.pubkey.slice(0, 2).toUpperCase(),
                          ),
                        ),
                      ),
                    ),
                    createElement(DropdownMenuContent, { className: "w-52" },
                      createElement(DropdownMenuLabel, null,
                        createElement("p", { className: "font-mono text-xs text-muted-foreground truncate" }, user.pubkey.slice(0, 20) + "..."),
                      ),
                      createElement(DropdownMenuSeparator, null),
                      createElement(DropdownMenuItem, { onClick: () => { window.location.href = "/directory"; } },
                        createElement(Globe, { className: "size-4" }), " Directory",
                      ),
                      createElement(DropdownMenuItem, { onClick: () => { window.location.href = "/wallet"; } },
                        createElement(Wallet, { className: "size-4" }), " Wallet",
                      ),
                      createElement(DropdownMenuSeparator, null),
                      createElement(DropdownMenuItem, { onClick: () => { window.location.href = "/signup"; } },
                        createElement(Radio, { className: "size-4" }), " Create Relay",
                      ),
                      createElement(DropdownMenuSeparator, null),
                      createElement(DropdownMenuItem, { onClick: () => { window.location.href = "/faq"; } },
                        createElement(HelpCircle, { className: "size-4" }), " FAQ",
                      ),
                      createElement(DropdownMenuSeparator, null),
                      createElement(DropdownMenuItem, { onClick: this.handleLogout, className: "text-destructive" },
                        createElement(LogOut, { className: "size-4" }), " Sign Out",
                      ),
                    ),
                  )
                : createElement(Button, { onClick: this.handleLogin, size: "sm", className: "gap-1.5" },
                    createElement(User, { className: "size-4" }), " Sign In",
                  ),

            // Mobile menu button
            createElement(Button, {
              variant: "ghost", size: "icon", className: "md:hidden",
              onClick: () => this.setState({ mobileOpen: !mobileOpen }),
            },
              createElement(Menu, { className: "size-5" }),
            ),
          ),
        ),
      ),

      // Mobile sheet
      mobileOpen ? createElement(Sheet, { open: true, onOpenChange: (open: boolean) => this.setState({ mobileOpen: open }) },
        createElement(SheetContent, { onClose: () => this.setState({ mobileOpen: false }) },
          createElement("div", { className: "flex items-center gap-2 font-bold mb-4" },
            createElement(Radio, { className: "size-4 text-primary" }),
            "relay.tools",
          ),
          createElement(Separator, null),
          createElement("nav", { className: "flex flex-col gap-1 mt-4" },
            createElement(Link, { to: "/admin", className: cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium mb-2", panelTier === "admin" ? "bg-primary text-primary-foreground" : "border border-input"), onClick: () => this.setState({ mobileOpen: false }) },
              createElement(PanelIcon, { className: "size-4" }), panelLabel,
            ),
            ...[
              { to: "/", label: "Home", Icon: Radio },
              { to: "/directory", label: "Directory", Icon: Globe },
              ...(user ? [{ to: "/wallet", label: "Wallet", Icon: Wallet }] : []),
              { to: "/signup", label: "Create Relay", Icon: Radio },
              { to: "/faq", label: "FAQ", Icon: HelpCircle },
            ].map((link) =>
              createElement(Link, { to: link.to, className: "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent", onClick: () => this.setState({ mobileOpen: false }) },
                createElement(link.Icon, { className: "size-4" }), link.label,
              ),
            ),
            // External links
            createElement("a", {
              href: "https://app.mycelium.social",
              className: "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent",
              onClick: () => this.setState({ mobileOpen: false }),
            },
              createElement(User, { className: "size-4" }), "Social",
            ),
            createElement("a", {
              href: "https://chat.mycelium.social",
              className: "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent",
              onClick: () => this.setState({ mobileOpen: false }),
            },
              createElement(Zap, { className: "size-4" }), "Chat",
            ),
            createElement(Separator, { className: "my-2" }),
            user
              ? createElement("button", { onClick: this.handleLogout, className: "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 cursor-pointer" },
                  createElement(LogOut, { className: "size-4" }), "Sign Out",
                )
              : createElement("button", { onClick: () => { this.handleLogin(); this.setState({ mobileOpen: false }); }, className: "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium cursor-pointer" },
                  createElement(User, { className: "size-4" }), "Sign In",
                ),
          ),
        ),
      ) : null,

      // Login error
      loginError ? createElement("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 pt-3" },
        createElement("div", { className: "flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" },
          createElement("span", null, loginError),
          createElement("button", { onClick: () => this.setState({ loginError: "" }), className: "ml-2 rounded-md p-1 hover:bg-destructive/20 transition-colors cursor-pointer" },
            createElement(X, { className: "size-4" }),
          ),
        ),
      ) : null,

      // Main content
      createElement("main", { className: "mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-8" },
        children,
      ),

      // Footer
      createElement("footer", { className: "border-t border-border/30 mt-auto" },
        createElement("div", { className: "mx-auto max-w-7xl px-4 sm:px-6 py-6" },
          createElement("div", { className: "flex flex-col items-center gap-4 sm:flex-row sm:justify-between text-sm text-muted-foreground" },
            createElement("div", { className: "flex items-center gap-2" },
              createElement(Radio, { className: "size-3.5 text-primary" }),
              createElement("span", { className: "font-medium text-foreground/80" }, "relay.tools"),
              createElement("span", { className: "text-border" }, "·"),
              createElement("span", { className: "text-xs" }, "GPLv3 Licensed"),
              createElement("span", { className: "text-border" }, "·"),
              createElement("span", { className: "text-xs" }, "Powered by strfry"),
            ),
            createElement("div", { className: "flex items-center gap-4" },
              createElement(Link, { to: "/directory", className: "text-xs hover:text-foreground transition-colors" }, "Directory"),
              createElement(Link, { to: "/faq", className: "text-xs hover:text-foreground transition-colors" }, "FAQ"),
              createElement(Link, { to: "/signup", className: "text-xs hover:text-foreground transition-colors" }, "Create Relay"),
              createElement("a", { href: "https://github.com/relaytools", target: "_blank", rel: "noopener noreferrer", className: "hover:text-foreground transition-colors" },
                createElement(Github, { className: "size-4" }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
