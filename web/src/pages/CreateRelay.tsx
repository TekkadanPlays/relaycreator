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

  return (
    <div className="space-y-8 pb-8 animate-in">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Create Your Relay</h1>
        <p className="text-muted-foreground">Choose a plan, pick a name, and deploy.</p>
      </div>

      {/* Plan cards */}
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
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
              <Badge className="absolute -top-2.5 right-4 glow-primary">Recommended</Badge>
            )}
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <div className={cn(
                  "size-5 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedPlan === plan.id ? "border-primary bg-primary scale-110" : "border-muted-foreground/20"
                )}>
                  {selectedPlan === plan.id && <Check className="size-3 text-primary-foreground" />}
                </div>
              </div>
              <div className="mb-1">
                <span className="text-4xl font-extrabold tabular-nums">{plan.price}</span>
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

      {/* Configure form */}
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Configure Your Relay</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pubkey">Your Pubkey</Label>
                <Input
                  id="pubkey"
                  value={user?.pubkey || ""}
                  placeholder="Sign in to auto-fill"
                  readOnly
                  className="font-mono text-xs"
                />
                {!user && (
                  <p className="text-sm text-amber-400">Sign in with NIP-07 to continue</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="relayname">Relay Subdomain</Label>
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
                  <div className="flex items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground font-mono">
                    .{domain}
                  </div>
                </div>
                {nameError && <p className="text-sm text-destructive">{nameError}</p>}
                {name && !nameError && (
                  <p className="text-sm text-muted-foreground">
                    Your relay: <span className="font-semibold text-foreground font-mono">{name}.{domain}</span>
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-center pt-2">
              <Button type="submit" size="lg" className="gap-2 px-8" disabled={!isValid() || submitting}>
                {submitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    <Radio className="size-5" />
                    Deploy {selectedPlan === "premium" ? "Premium" : "Standard"} Relay
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
