import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../stores/auth";
import { api } from "../lib/api";
import { Check, Loader2, Zap, AlertCircle, Radio } from "lucide-react";
import { nip19 } from "nostr-tools";
import { Button } from "@/components/ui/button";
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

  const domain = config?.domain || "mycelium.social";

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
      setNameError("Letters, numbers, and hyphens only");
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
  const currentPrice = selectedPlan === "premium" ? premiumPrice : standardPrice;

  const plans = [
    {
      id: "standard" as const,
      label: "Standard",
      price: standardPrice,
      desc: "Full relay with complete customization",
      features: [
        "Customizable on-the-fly",
        "Inbox / Outbox support",
        "Public / Private modes",
        "Communities & DMs",
        "NIP-42 authentication",
        "Access control lists",
      ],
    },
    {
      id: "premium" as const,
      label: "Premium",
      price: premiumPrice,
      desc: "Everything in Standard, plus power features",
      best: true,
      features: [
        "Everything in Standard",
        "Relay-to-relay streaming",
        "Social graph filtering",
        "Priority provisioning",
        "Lightning paywalls",
        "Advanced event filtering",
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-2xl animate-in">
      {/* Header */}
      <div className="pt-6 pb-8 sm:pt-10 sm:pb-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Create a <span className="text-gradient">Relay</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose a plan, pick a name, and you're live in under a minute.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Plan Selection */}
        <section className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            1. Choose your plan
          </Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "relative flex flex-col rounded-lg border p-5 text-left transition-all",
                  selectedPlan === plan.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/50 hover:border-border"
                )}
              >
                {plan.best && (
                  <Badge className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                    Recommended
                  </Badge>
                )}
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-semibold">{plan.label}</span>
                  <span className="text-lg font-bold tabular-nums">
                    {plan.price.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground ml-1">sats</span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{plan.desc}</p>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className={cn(
                        "size-3 shrink-0",
                        selectedPlan === plan.id ? "text-primary" : "text-muted-foreground/50"
                      )} />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </section>

        {/* Relay Name */}
        <section className="space-y-3">
          <Label htmlFor="relayname" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            2. Pick a name
          </Label>
          <div className="flex">
            <Input
              id="relayname"
              placeholder="myrelay"
              autoComplete="off"
              autoFocus
              value={name}
              onChange={(e) => validateName(e.target.value)}
              className={cn(
                "rounded-r-none border-r-0 text-base h-11",
                nameError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <div className="flex items-center rounded-r-md border border-l-0 bg-muted px-4 text-sm text-muted-foreground font-mono">
              .{domain}
            </div>
          </div>
          {nameError && (
            <p className="text-xs text-destructive">{nameError}</p>
          )}
          {name && !nameError && (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
              <Radio className="size-3.5 text-primary shrink-0" />
              <code className="font-mono text-sm text-foreground">
                wss://{name}.{domain}
              </code>
            </div>
          )}
        </section>

        {/* Auth state */}
        {!user && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            Sign in with a Nostr extension to continue.
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="space-y-3 pt-2">
          <Button type="submit" className="w-full gap-2 h-12 text-base" disabled={!isValid() || submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Zap className="size-4" />
                Deploy for {currentPrice.toLocaleString()} sats
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You'll be taken to a Lightning invoice to complete payment.
          </p>
        </div>
      </form>
    </div>
  );
}
