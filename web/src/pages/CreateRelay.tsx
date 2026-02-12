import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../stores/auth";
import { api } from "../lib/api";
import { Radio, Check, Loader2, Zap, Globe, Shield, Workflow } from "lucide-react";
import { nip19 } from "nostr-tools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CreateRelay() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "premium">("standard");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: () => api.get<{ domain: string; payments_enabled: boolean; invoice_amount: number; invoice_premium_amount: number }>("/config"),
    staleTime: 60_000,
  });

  const domain = config?.domain || "nostr1.com";

  function validateName(val: string) {
    setName(val);
    setError("");
    if (!val) {
      setNameError("");
      return;
    }
    if (/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}$/.test(val)) {
      setNameError("");
    } else {
      setNameError("Must be a valid hostname (letters, numbers, hyphens)");
    }
  }

  function isValid() {
    return user && name.length > 0 && !nameError;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid() || !user) return;

    setSubmitting(true);
    setError("");

    try {
      let submitHex = user.pubkey;
      if (/^npub1[0-9a-zA-Z]{58}$/.test(user.pubkey)) {
        const decoded = nip19.decode(user.pubkey);
        submitHex = decoded.data as string;
      }

      const data = await api.get<{ order_id: string }>(
        `/invoices?relayname=${name}&pubkey=${submitHex}&plan=${selectedPlan}`
      );

      navigate(`/invoices?relayname=${name}&pubkey=${submitHex}&order_id=${data.order_id}&plan=${selectedPlan}`);
    } catch (err: any) {
      setError(err.message || "Failed to create relay");
    } finally {
      setSubmitting(false);
    }
  }

  const standardPrice = config?.invoice_amount ?? 21;
  const premiumPrice = config?.invoice_premium_amount ?? 2100;

  const plans = [
    {
      id: "standard" as const,
      name: "Standard",
      price: standardPrice.toLocaleString(),
      description: "Everything you need to run a personal relay",
      features: ["Customizable on-the-fly", "Inbox / Outbox support", "Public / Private modes", "Communities & DMs"],
    },
    {
      id: "premium" as const,
      name: "Premium",
      price: premiumPrice.toLocaleString(),
      description: "For power users who want the full experience",
      recommended: true,
      features: ["All Standard features", "Relay-to-relay streaming", "Social graph filtering", "Priority provisioning"],
    },
  ];

  const step = name && !nameError && user ? 3 : name || user ? 2 : 1;

  return (
    <div className="animate-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-56 shrink-0 space-y-4">
          <div className="flex items-center gap-2.5 px-1">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radio className="size-4.5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-sm">Create Relay</h1>
              <p className="text-[11px] text-muted-foreground">Deploy in under a minute</p>
            </div>
          </div>

          {/* Steps */}
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {[
              { num: 1, label: "Choose Plan", done: step > 1 },
              { num: 2, label: "Configure", done: step > 2 },
              { num: 3, label: "Deploy", done: false },
            ].map((s) => (
              <div
                key={s.num}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  step === s.num ? "bg-primary/10 text-primary" : s.done ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center size-6 rounded-full text-xs font-bold transition-all",
                  step === s.num ? "bg-primary text-primary-foreground" : s.done ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                )}>
                  {s.done ? <Check className="size-3" /> : s.num}
                </div>
                {s.label}
              </div>
            ))}
          </nav>

          {/* Price summary */}
          {selectedPlan && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Selected Plan</p>
                <p className="font-bold">{selectedPlan === "premium" ? "Premium" : "Standard"}</p>
                <p className="text-2xl font-bold tabular-nums mt-1">
                  {selectedPlan === "premium" ? premiumPrice.toLocaleString() : standardPrice.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1">sats</span>
                </p>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-8">
          {/* Plan Selection */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Choose Your Plan</h2>
              <p className="text-sm text-muted-foreground">Select the plan that fits your needs.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={cn(
                    "group relative cursor-pointer transition-all duration-300 overflow-hidden",
                    selectedPlan === plan.id
                      ? "border-primary ring-1 ring-primary/20 shadow-lg shadow-primary/5"
                      : "border-border/50 hover:border-border hover:shadow-md"
                  )}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {selectedPlan === plan.id && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  )}
                  {plan.recommended && (
                    <Badge className="absolute -top-2.5 right-4">Recommended</Badge>
                  )}
                  <CardContent className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <div className={cn(
                        "size-5 rounded-full border-2 flex items-center justify-center transition-all",
                        selectedPlan === plan.id ? "border-primary bg-primary scale-110" : "border-muted-foreground/20"
                      )}>
                        {selectedPlan === plan.id && <Check className="size-3 text-primary-foreground" />}
                      </div>
                    </div>
                    <div className="mb-1">
                      <span className="text-3xl font-extrabold tabular-nums">{plan.price}</span>
                      <span className="ml-1.5 text-sm text-muted-foreground">sats</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>
                    <ul className="space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm">
                          <div className="flex items-center justify-center size-5 rounded-full bg-emerald-500/10">
                            <Check className="size-3 text-emerald-400 shrink-0" />
                          </div>
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Configure Your Relay</h2>
              <p className="text-sm text-muted-foreground">Pick a name and deploy.</p>
            </div>

            <Card className="border-border/50">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="pubkey" className="text-xs font-medium text-muted-foreground">Your Pubkey</Label>
                    <Input
                      id="pubkey"
                      value={user?.pubkey || ""}
                      placeholder="Sign in to auto-fill"
                      readOnly
                      className="font-mono text-xs bg-muted/30"
                    />
                    {!user && (
                      <p className="text-xs text-amber-400">Sign in with NIP-07 to continue</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="relayname" className="text-xs font-medium text-muted-foreground">Relay Subdomain</Label>
                    <div className="flex gap-2">
                      <Input
                        id="relayname"
                        placeholder="yourname"
                        autoComplete="off"
                        autoFocus
                        value={name}
                        onChange={(e) => validateName(e.target.value)}
                        className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
                      />
                      <div className="flex items-center rounded-lg border border-border/50 bg-muted/30 px-3 text-sm text-muted-foreground font-mono">
                        .{domain}
                      </div>
                    </div>
                    {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                    {name && !nameError && (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                        <Check className="size-3.5 text-emerald-400" />
                        <span className="font-mono text-xs">wss://{name}.{domain}</span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <Loader2 className="size-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full gap-2" size="lg" disabled={!isValid() || submitting}>
                    {submitting ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="size-5" />
                        Deploy {selectedPlan === "premium" ? "Premium" : "Standard"} Relay
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
