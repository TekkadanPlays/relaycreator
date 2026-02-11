import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../stores/auth";
import { api } from "../lib/api";
import { Radio, Check, Loader2, Sparkles } from "lucide-react";
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
      features: ["Customizable on-the-fly", "Inbox / Outbox support", "Public / Private modes", "Communities / DMs"],
    },
    {
      id: "premium" as const,
      name: "Premium",
      price: premiumPrice.toLocaleString(),
      badge: "RECOMMENDED",
      features: ["All standard features", "Streaming from other relays", "Enhanced filtering by social graph"],
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Create Your Nostr Relay</h1>
        <p className="text-lg text-muted-foreground">Choose your plan and get started in minutes</p>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
              selectedPlan === plan.id
                ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                : "border-border/50 hover:border-primary/40"
            )}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {plan.badge && (
              <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground">
                <Sparkles className="mr-1 size-3" /> {plan.badge}
              </Badge>
            )}
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <div className={cn(
                  "size-5 rounded-full border-2 transition-colors",
                  selectedPlan === plan.id
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {selectedPlan === plan.id && (
                    <Check className="size-full p-0.5 text-primary-foreground" />
                  )}
                </div>
              </div>
              <div className="mb-5">
                <span className="text-4xl font-extrabold text-primary">{plan.price}</span>
                <span className="ml-1.5 text-sm text-muted-foreground">sats</span>
              </div>
              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className="size-4 shrink-0 text-emerald-400" /> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mx-auto max-w-4xl">
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
                  <div className="flex items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                    .{domain}
                  </div>
                </div>
                {nameError && <p className="text-sm text-destructive">{nameError}</p>}
                {name && !nameError && (
                  <p className="text-sm text-muted-foreground">
                    Your relay: <span className="font-semibold text-primary">{name}.{domain}</span>
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
