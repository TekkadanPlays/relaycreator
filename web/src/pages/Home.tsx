import { Link } from "react-router";
import { Radio, Zap, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center text-center">
      <div className="max-w-2xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Radio className="size-4" />
          Nostr Relay Hosting
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          Your Relay,{" "}
          <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Your Rules
          </span>
        </h1>

        <p className="mx-auto max-w-lg text-lg text-muted-foreground">
          Deploy a customizable Nostr relay in minutes. Control who can post,
          moderate content, and own your corner of the decentralized web.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button size="lg" className="gap-2 text-base" asChild>
            <Link to="/signup">
              <Radio className="size-5" /> Create Your Relay
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base" asChild>
            <Link to="/directory">Browse Directory</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-12 md:grid-cols-3">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <div className="rounded-xl bg-amber-500/10 p-3">
                <Zap className="size-8 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                Powered by strfry, one of the fastest relay implementations
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <Shield className="size-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold">Full Control</h3>
              <p className="text-sm text-muted-foreground">
                Allow lists, block lists, keyword filters, and Web of Access
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <div className="rounded-xl bg-blue-500/10 p-3">
                <Globe className="size-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold">Your Subdomain</h3>
              <p className="text-sm text-muted-foreground">
                Get yourname.mycelium.social with instant DNS and SSL
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
