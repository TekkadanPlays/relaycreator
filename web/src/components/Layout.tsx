import { Outlet, Link, useLocation } from "react-router";
import { useAuth } from "../stores/auth";
import { Radio, LogOut, Menu, Zap, Globe, User, Loader2, X, HelpCircle, Sparkles, Github } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

const navLinks = [
  { to: "/directory", label: "Directory", icon: Globe },
  { to: "/signup", label: "Create Relay", icon: Sparkles },
  { to: "/faq", label: "FAQ", icon: HelpCircle },
];

export default function Layout() {
  const { user, login, logout, loading } = useAuth();
  const [loginError, setLoginError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleLogin = async () => {
    try {
      setLoginError("");
      await login();
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="relative min-h-screen bg-background flex flex-col">
      {/* Ambient glow behind nav */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-primary/8 animate-glow-pulse blur-3xl" />

      <header className="sticky top-0 z-50 glass-strong">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="relative">
              <Radio className="size-7 text-primary transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gradient sm:text-2xl">
              relay.tools
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {navLinks.map((link) => (
              <Button
                key={link.to}
                variant="ghost"
                size="sm"
                className={`gap-1.5 transition-all duration-200 ${
                  isActive(link.to)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                asChild
              >
                <Link to={link.to}>
                  <link.icon className="size-3.5" />
                  {link.label}
                </Link>
              </Button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-400 text-primary-foreground text-xs font-bold">
                        {user.pubkey.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 border-2 border-background" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-strong">
                  <DropdownMenuLabel className="font-mono text-xs text-muted-foreground truncate">
                    {user.pubkey.slice(0, 20)}...
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/relays/myrelays" className="cursor-pointer gap-2">
                      <Zap className="size-4 text-amber-400" /> My Relays
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/directory" className="cursor-pointer gap-2">
                      <Globe className="size-4 text-blue-400" /> Directory
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/signup" className="cursor-pointer gap-2">
                      <Sparkles className="size-4 text-primary" /> Create Relay
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/faq" className="cursor-pointer gap-2">
                      <HelpCircle className="size-4 text-muted-foreground" /> FAQ
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer gap-2 text-destructive focus:text-destructive">
                    <LogOut className="size-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={handleLogin} size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 border-0 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-primary/40">
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
              <SheetContent side="right" className="w-72 glass-strong border-l-border/30">
                <SheetTitle className="flex items-center gap-2 text-lg font-bold">
                  <Radio className="size-5 text-primary" />
                  <span className="text-gradient">relay.tools</span>
                </SheetTitle>
                <Separator className="my-4 opacity-30" />
                <nav className="flex flex-col gap-1">
                  {[{ to: "/", label: "Home", icon: Radio }, ...navLinks].map((link) => (
                    <Button
                      key={link.to}
                      variant="ghost"
                      className={`justify-start gap-2.5 ${
                        isActive(link.to) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                      asChild
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to={link.to}>
                        <link.icon className="size-4" /> {link.label}
                      </Link>
                    </Button>
                  ))}
                  {user && (
                    <>
                      <Separator className="my-2 opacity-30" />
                      <Button variant="ghost" className="justify-start gap-2.5" asChild onClick={() => setMobileOpen(false)}>
                        <Link to="/relays/myrelays">
                          <Zap className="size-4 text-amber-400" /> My Relays
                        </Link>
                      </Button>
                    </>
                  )}
                  <Separator className="my-2 opacity-30" />
                  {user ? (
                    <Button variant="ghost" className="justify-start gap-2.5 text-destructive hover:text-destructive" onClick={() => { logout(); setMobileOpen(false); }}>
                      <LogOut className="size-4" /> Sign Out
                    </Button>
                  ) : (
                    <Button onClick={() => { handleLogin(); setMobileOpen(false); }} className="justify-start gap-2.5 bg-gradient-to-r from-primary to-purple-500 border-0">
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-3 animate-fade-up">
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

      <footer className="relative border-t border-border/20 mt-auto">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <Radio className="size-4 text-primary/60" />
              <span className="text-sm font-medium text-muted-foreground">relay.tools</span>
              <span className="text-xs text-muted-foreground/50">•</span>
              <span className="text-xs text-muted-foreground/50">Sovereign relay hosting</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground/50">
              <span>Powered by strfry</span>
              <a href="https://github.com/relaytools" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                <Github className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
