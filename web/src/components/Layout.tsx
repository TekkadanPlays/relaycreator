import { Outlet, Link, useLocation } from "react-router";
import { useAuth } from "../stores/auth";
import { useNostrProfile } from "../hooks/useNostrProfile";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  Radio, LogOut, Menu, Zap, Globe, User, Loader2, X,
  HelpCircle, Github, Wallet, Shield, Play,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

const mobileLinks = [
  { to: "/", label: "Home", icon: Radio },
  { to: "/directory", label: "Directory", icon: Globe },
  { to: "/signup", label: "Create Relay", icon: Radio },
  { to: "/faq", label: "FAQ", icon: HelpCircle },
];

const mobileAuthLinks = [
  { to: "/", label: "Home", icon: Radio },
  { to: "/directory", label: "Directory", icon: Globe },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/signup", label: "Create Relay", icon: Radio },
  { to: "/faq", label: "FAQ", icon: HelpCircle },
];

type PanelTier = "admin" | "operator" | "demo";

function usePanelTier(): { tier: PanelTier; label: string; icon: typeof Shield } {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["myRelays"],
    queryFn: () => api.get<{ myRelays: any[]; moderatedRelays: any[] }>("/relays/mine"),
    enabled: !!user,
    staleTime: 60_000,
  });

  if (user?.admin) return { tier: "admin", label: "Admin Panel", icon: Shield };
  const hasRelays = (data?.myRelays?.length ?? 0) > 0 || (data?.moderatedRelays?.length ?? 0) > 0;
  if (user && hasRelays) return { tier: "operator", label: "My Relays", icon: Zap };
  return { tier: "demo", label: "Live Demo", icon: Play };
}

export default function Layout() {
  const { user, login, logout, loading } = useAuth();
  const { profile, displayName } = useNostrProfile(user?.pubkey);
  const [loginError, setLoginError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { tier, label: panelLabel, icon: PanelIcon } = usePanelTier();

  const handleLogin = async () => {
    try {
      setLoginError("");
      await login();
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
    }
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");
  const sheetLinks = user ? mobileAuthLinks : mobileLinks;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <Radio className="size-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">relay.tools</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* 3-tier panel button — always visible */}
            <Button
              variant={tier === "admin" ? "default" : "outline"}
              size="sm"
              className="gap-1.5 hidden sm:inline-flex"
              asChild
            >
              <Link to="/admin">
                <PanelIcon className="size-4" /> {panelLabel}
              </Link>
            </Button>

            {loading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="size-8">
                        {profile?.picture && (
                          <AvatarImage src={profile.picture} alt={displayName || ""} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                          {(displayName || user.pubkey.slice(0, 2)).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="space-y-0.5">
                      {displayName && (
                        <p className="text-sm font-medium truncate">{displayName}</p>
                      )}
                      <p className="font-mono text-xs text-muted-foreground truncate">
                        {user.pubkey.slice(0, 20)}...
                      </p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/directory" className="cursor-pointer gap-2">
                        <Globe className="size-4" /> Directory
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/wallet" className="cursor-pointer gap-2">
                        <Wallet className="size-4" /> Wallet
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/signup" className="cursor-pointer gap-2">
                        <Radio className="size-4" /> Create Relay
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/faq" className="cursor-pointer gap-2">
                        <HelpCircle className="size-4" /> FAQ
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                      <LogOut className="size-4" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={handleLogin} size="sm" className="gap-1.5">
                <User className="size-4" /> Sign In
              </Button>
            )}

            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetTitle className="flex items-center gap-2 font-bold">
                  <Radio className="size-4 text-primary" />
                  relay.tools
                </SheetTitle>
                <Separator className="my-4" />
                <nav className="flex flex-col gap-1">
                  {/* Panel button in mobile */}
                  <Button
                    variant={tier === "admin" ? "default" : "outline"}
                    className="justify-start gap-2 mb-2"
                    asChild
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link to="/admin">
                      <PanelIcon className="size-4" /> {panelLabel}
                    </Link>
                  </Button>

                  {sheetLinks.map((link) => (
                    <Button
                      key={link.to}
                      variant="ghost"
                      className={`justify-start gap-2 ${
                        isActive(link.to) ? "bg-accent text-foreground" : "text-muted-foreground"
                      }`}
                      asChild
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to={link.to}>
                        <link.icon className="size-4" /> {link.label}
                      </Link>
                    </Button>
                  ))}

                  <Separator className="my-2" />
                  {user ? (
                    <Button variant="ghost" className="justify-start gap-2 text-destructive hover:text-destructive" onClick={() => { logout(); setMobileOpen(false); }}>
                      <LogOut className="size-4" /> Sign Out
                    </Button>
                  ) : (
                    <Button onClick={() => { handleLogin(); setMobileOpen(false); }} className="justify-start gap-2">
                      <User className="size-4" /> Sign In
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {loginError && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-3">
          <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{loginError}</span>
            <button onClick={() => setLoginError("")} className="ml-2 rounded-md p-1 hover:bg-destructive/20 transition-colors">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border/30 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Radio className="size-3.5 text-primary" />
              <span className="font-medium text-foreground/80">relay.tools</span>
              <span className="text-border">·</span>
              <span className="text-xs">GPLv3 Licensed</span>
              <span className="text-border">·</span>
              <span className="text-xs">Powered by strfry</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/directory" className="text-xs hover:text-foreground transition-colors">Directory</Link>
              <Link to="/faq" className="text-xs hover:text-foreground transition-colors">FAQ</Link>
              <Link to="/signup" className="text-xs hover:text-foreground transition-colors">Create Relay</Link>
              <a href="https://github.com/relaytools" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                <Github className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
