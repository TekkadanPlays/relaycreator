import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Link } from "inferno-router";
import { authStore, login, logout, type AuthState } from "../stores/auth";
import { api } from "../lib/api";
import { Button } from "@/ui/Button";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/Avatar";
import { Separator } from "@/ui/Separator";
import {
  DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/ui/DropdownMenu";
import { Sheet, SheetContent } from "@/ui/Sheet";
import {
  Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from "@/ui/Command";
import {
  Radio, LogOut, Menu, Zap, Globe, User, Loader2, X,
  HelpCircle, Github, Wallet, Shield, Play, ChevronDown,
  MessageCircle, ExternalLink, FileText, Search,
} from "@/lib/icons";
import { cn } from "@/ui/utils";
import type { IconComponent } from "@/lib/icon";
import { MushLogo } from "./MushLogo";
import { ThemeToggle } from "@/ui/ThemeToggle";
import { ThemeSelector } from "@/ui/ThemeSelector";

interface NavItem {
  label: string;
  href: string;
  Icon: IconComponent;
  external?: boolean;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",         href: "/",          Icon: Radio,         group: "Relay Tools" },
  { label: "Directory",    href: "/directory",  Icon: Globe,         group: "Relay Tools" },
  { label: "Discover",     href: "/discover",   Icon: Search,        group: "Relay Tools" },
  { label: "Relays",       href: "/relays",     Icon: Radio,         group: "Relay Tools" },
  { label: "Docs",         href: "/docs",       Icon: FileText,      group: "Relay Tools" },
  { label: "Live",          href: "https://live.mycelium.social", Icon: Play,          group: "Mycelium", external: true },
  { label: "Social",       href: "https://app.mycelium.social",  Icon: User,          group: "Mycelium", external: true },
  { label: "Chat",         href: "https://chat.mycelium.social", Icon: MessageCircle, group: "Mycelium", external: true },
];

interface LayoutProps {
  children?: any;
}

interface LayoutState extends AuthState {
  loginError: string;
  mobileOpen: boolean;
  navOpen: boolean;
  navSearch: string;
  userMenuOpen: boolean;
  panelTier: "admin" | "operator" | "demo";
  panelLabel: string;
}

export default class Layout extends Component<LayoutProps, LayoutState> {
  declare state: LayoutState;
  private unsub: (() => void) | null = null;
  private navRef: HTMLDivElement | null = null;
  private userMenuRef: HTMLDivElement | null = null;

  constructor(props: LayoutProps) {
    super(props);
    const auth = authStore.get();
    this.state = {
      ...auth,
      loginError: "",
      mobileOpen: false,
      navOpen: false,
      navSearch: "",
      userMenuOpen: false,
      panelTier: "demo",
      panelLabel: "Live Demo",
    };
  }

  private handleNavOutside = (e: MouseEvent) => {
    if (this.state.navOpen && this.navRef && !this.navRef.contains(e.target as Node)) {
      this.setState({ navOpen: false });
    }
    if (this.state.userMenuOpen && this.userMenuRef && !this.userMenuRef.contains(e.target as Node)) {
      this.setState({ userMenuOpen: false });
    }
  };

  componentDidMount() {
    this.unsub = authStore.subscribe((s) => {
      this.setState(s as any);
      this.updatePanelTier(s);
    });
    this.updatePanelTier(authStore.get());
    document.addEventListener('mousedown', this.handleNavOutside);
  }

  componentWillUnmount() {
    this.unsub?.();
    document.removeEventListener('mousedown', this.handleNavOutside);
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
    const { user, loading, loginError, mobileOpen, navOpen, navSearch, userMenuOpen, panelTier, panelLabel } = this.state;
    const { children } = this.props;
    const PanelIcon = panelTier === "admin" ? Shield : panelTier === "operator" ? Zap : Play;

    return createElement("div", { className: "min-h-screen bg-background flex flex-col" },

      // Header
      createElement("header", { className: "sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl backdrop-saturate-150" },
        createElement("div", { className: "mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6" },

          // Logo + Docs
          createElement("div", { className: "flex items-center gap-4" },
            createElement(Link, { to: "/", className: "flex items-center gap-2.5 group shrink-0" },
              createElement(MushLogo, { className: "size-8", glow: true }),
              createElement("span", { className: "text-lg font-bold tracking-tight" }, "mycelium"),
            ),
            createElement(Link, { to: "/docs", className: "hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" },
              createElement(FileText, { className: "size-3.5" }),
              "Docs",
            ),
          ),

          // Center nav combobox (desktop)
          createElement("div", {
            ref: (el: HTMLDivElement | null) => { this.navRef = el; },
            className: "hidden sm:block relative",
          },
            createElement(Button, {
              variant: "outline", size: "sm",
              className: "gap-1.5 text-sm font-medium w-[180px] justify-between",
              onClick: () => this.setState((s: LayoutState) => ({ navOpen: !s.navOpen, navSearch: "" })),
            },
              createElement(Globe, { className: "size-4" }),
              "Navigate",
              createElement(ChevronDown, { className: "size-3.5 opacity-50" }),
            ),
            navOpen
              ? createElement("div", { className: "absolute top-full left-0 z-50 mt-1 w-[220px]" },
                  createElement(Command, { className: "rounded-lg border shadow-md" },
                    createElement(CommandInput, {
                      placeholder: "Search pages...",
                      value: navSearch,
                      onInput: (e: Event) => this.setState({ navSearch: (e.target as HTMLInputElement).value }),
                    }),
                    createElement(CommandList, null,
                      (() => {
                        const q = navSearch.toLowerCase();
                        const filtered = q ? NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(q)) : NAV_ITEMS;
                        if (filtered.length === 0) return createElement(CommandEmpty, null, "No pages found.");
                        const groups = [...new Set(filtered.map((n) => n.group))];
                        return groups.map((g) =>
                          createElement(CommandGroup, { heading: g, key: g },
                            ...filtered.filter((n) => n.group === g).map((item) =>
                              createElement(CommandItem, {
                                key: item.href,
                                onClick: () => {
                                  this.setState({ navOpen: false });
                                  if (item.external) { window.location.href = item.href; }
                                  else { window.location.href = item.href; }
                                },
                              },
                                createElement(item.Icon, { className: "size-4" }),
                                item.label,
                                item.external
                                  ? createElement(ExternalLink, { className: "size-3 ml-auto opacity-40" })
                                  : null,
                              ),
                            ),
                          ),
                        );
                      })(),
                    ),
                  ),
                )
              : null,
          ),

          // Right side — matches app.mycelium.social header style
          createElement("div", { className: "flex items-center gap-1.5" },

            // GitHub icon (inline SVG, clean icon button — no border)
            createElement("a", {
              href: "https://github.com/TekkadanPlays",
              target: "_blank",
              rel: "noopener noreferrer",
              title: "GitHub",
              className: "hidden sm:inline-flex items-center justify-center rounded-md size-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            },
              createElement("svg", {
                className: "size-4", viewBox: "0 0 24 24", fill: "currentColor",
              }, createElement("path", { d: "M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" })),
            ),

            // Theme selector (color palette picker)
            createElement(ThemeSelector, { className: "hidden sm:inline-flex size-8" }),

            // Theme toggle (light/dark)
            createElement(ThemeToggle, { className: "hidden sm:inline-flex size-8" }),

            // Auth section
            loading
              ? createElement(Loader2, { className: "size-4 animate-spin text-muted-foreground" })
              : user
                ? createElement("div", {
                    ref: (el: HTMLDivElement | null) => { this.userMenuRef = el; },
                    className: "relative hidden md:block",
                  },
                    // Pill-shaped user button with avatar + name
                    createElement("button", {
                      onClick: () => this.setState((s: LayoutState) => ({ userMenuOpen: !s.userMenuOpen })),
                      className: "flex items-center gap-2 rounded-full border border-border px-1 py-1 pr-3 hover:bg-accent/50 transition-colors cursor-pointer",
                    },
                      createElement(Avatar, { className: "size-7" },
                        user.picture
                          ? createElement(AvatarImage, { src: user.picture, alt: user.name || "Profile" })
                          : null,
                        createElement(AvatarFallback, { className: "text-[10px]" },
                          user.pubkey.slice(0, 2).toUpperCase(),
                        ),
                      ),
                      createElement("span", { className: "text-sm font-medium max-w-[120px] truncate" },
                        user.name || user.pubkey.slice(0, 8) + "...",
                      ),
                      createElement("span", { className: "text-xs opacity-40" }, "\u25BE"),
                    ),
                    // Dropdown menu
                    userMenuOpen
                      ? createElement("div", {
                          className: "absolute right-0 top-full mt-2 w-52 bg-popover border border-border rounded-lg shadow-lg py-1 z-50",
                        },
                          createElement("div", { className: "px-3 py-2 border-b border-border" },
                            createElement("p", { className: "font-mono text-xs text-muted-foreground truncate" }, user.pubkey.slice(0, 20) + "..."),
                          ),
                          createElement(Link, { to: "/admin", onClick: () => this.setState({ userMenuOpen: false }), className: "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" },
                            createElement(Shield, { className: "size-4" }), "Admin Panel",
                          ),
                          createElement(Link, { to: "/wallet", onClick: () => this.setState({ userMenuOpen: false }), className: "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" },
                            createElement(Wallet, { className: "size-4" }), "Wallet",
                          ),
                          createElement(Link, { to: "/signup", onClick: () => this.setState({ userMenuOpen: false }), className: "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" },
                            createElement(Zap, { className: "size-4" }), "Create Relay",
                          ),
                          createElement(Link, { to: "/discover", onClick: () => this.setState({ userMenuOpen: false }), className: "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" },
                            createElement(Globe, { className: "size-4" }), "Discover Relays",
                          ),
                          createElement(Link, { to: "/relays", onClick: () => this.setState({ userMenuOpen: false }), className: "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" },
                            createElement(Radio, { className: "size-4" }), "Relay Manager",
                          ),
                          createElement(Link, { to: "/faq", onClick: () => this.setState({ userMenuOpen: false }), className: "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" },
                            createElement(HelpCircle, { className: "size-4" }), "FAQ",
                          ),
                          createElement("div", { className: "border-t border-border my-1" }),
                          createElement("button", {
                            onClick: () => { this.handleLogout(); this.setState({ userMenuOpen: false }); },
                            className: "flex items-center gap-2 px-3 py-2 w-full text-sm text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer",
                          }, createElement(LogOut, { className: "size-4" }), "Sign Out"),
                        )
                      : null,
                  )
                : createElement(Button, {
                    onClick: this.handleLogin, size: "sm",
                    className: "hidden md:inline-flex",
                  }, "Sign In"),

            // Mobile menu button
            createElement("button", {
              onClick: () => this.setState({ mobileOpen: !mobileOpen }),
              className: "md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer",
            }, mobileOpen ? "\u2715" : "\u2630"),
          ),
        ),
      ),

      // Mobile sheet
      mobileOpen ? createElement(Sheet, { open: true, onOpenChange: (open: boolean) => this.setState({ mobileOpen: open }) },
        createElement(SheetContent, { onClose: () => this.setState({ mobileOpen: false }) },
          createElement("div", { className: "flex items-center gap-2 font-bold mb-4" },
            createElement(MushLogo, { className: "size-6" }),
            "mycelium",
          ),
          createElement(Separator, null),
          createElement("nav", { className: "flex flex-col gap-1 mt-4" },
            createElement(Link, { to: "/admin", className: cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium mb-2", panelTier === "admin" ? "bg-primary text-primary-foreground" : "border border-input"), onClick: () => this.setState({ mobileOpen: false }) },
              createElement(PanelIcon, { className: "size-4" }), panelLabel,
            ),
            ...NAV_ITEMS.filter((n) => !n.external).map((item) =>
              createElement(Link, {
                to: item.href,
                className: "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent",
                onClick: () => this.setState({ mobileOpen: false }),
              },
                createElement(item.Icon, { className: "size-4" }), item.label,
              ),
            ),
            createElement(Separator, { className: "my-1" }),
            createElement("div", { className: "px-2 py-1.5 text-xs font-medium text-muted-foreground" }, "Mycelium"),
            ...NAV_ITEMS.filter((n) => n.external).map((item) =>
              createElement("a", {
                href: item.href,
                className: "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent",
                onClick: () => this.setState({ mobileOpen: false }),
              },
                createElement(item.Icon, { className: "size-4" }),
                item.label,
                createElement(ExternalLink, { className: "size-3 ml-auto opacity-40" }),
              ),
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
              createElement(MushLogo, { className: "size-5" }),
              createElement("span", { className: "font-medium text-foreground/80" }, "mycelium.social"),
              createElement("span", { className: "text-border" }, "·"),
              createElement("span", { className: "text-xs" }, "Powered by relay.tools & strfry"),
              createElement("span", { className: "text-border" }, "·"),
              createElement("span", { className: "text-xs" }, "GPLv3 Licensed"),
            ),
            createElement("div", { className: "flex items-center gap-4" },
              createElement(Link, { to: "/directory", className: "text-xs hover:text-foreground transition-colors" }, "Directory"),
              createElement(Link, { to: "/discover", className: "text-xs hover:text-foreground transition-colors" }, "Discover"),
              createElement(Link, { to: "/relays", className: "text-xs hover:text-foreground transition-colors" }, "Relays"),
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
