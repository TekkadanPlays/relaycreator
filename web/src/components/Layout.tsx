import { Outlet, Link } from "react-router";
import { useAuth } from "../stores/auth";
import { Radio, LogOut, Menu, Zap, Globe, User, Loader2, X, HelpCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

export default function Layout() {
  const { user, login, logout, loading } = useAuth();
  const [loginError, setLoginError] = useState("");

  const handleLogin = async () => {
    try {
      setLoginError("");
      await login();
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-primary transition-colors hover:text-primary/80">
            <Radio className="size-7" />
            <span>relay.tools</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/directory">Directory</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/signup">Create Relay</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/faq">FAQ</Link>
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-mono">
                        {user.pubkey.slice(0, 4)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/relays/myrelays" className="cursor-pointer">
                      <Zap className="mr-2 size-4" /> My Relays
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/directory" className="cursor-pointer">
                      <Globe className="mr-2 size-4" /> Directory
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/signup" className="cursor-pointer">
                      <Radio className="mr-2 size-4" /> Create Relay
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/faq" className="cursor-pointer">
                      <HelpCircle className="mr-2 size-4" /> FAQ
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 size-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button onClick={handleLogin} size="sm" className="gap-1.5">
                  <User className="size-4" /> Sign In
                </Button>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                      <Menu className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-64">
                    <SheetTitle className="text-lg font-bold text-primary">relay.tools</SheetTitle>
                    <Separator className="my-4" />
                    <nav className="flex flex-col gap-2">
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/">Home</Link>
                      </Button>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/directory">Directory</Link>
                      </Button>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/signup">Create Relay</Link>
                      </Button>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/faq">FAQ</Link>
                      </Button>
                      <Separator className="my-2" />
                      <Button onClick={handleLogin} className="justify-start gap-2">
                        <User className="size-4" /> Sign In
                      </Button>
                    </nav>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>
      </header>

      {loginError && (
        <div className="mx-auto max-w-7xl px-4 pt-3">
          <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{loginError}</span>
            <button onClick={() => setLoginError("")} className="ml-2 rounded-md p-1 hover:bg-destructive/20">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-border/40 mt-auto">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
          <span>relay.tools</span>
          <span>Powered by strfry</span>
        </div>
      </footer>
    </div>
  );
}
