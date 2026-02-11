import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../stores/auth";
import { api } from "../lib/api";
import { Radio, Check, Loader2, Sparkles, Zap, Globe, Shield, Workflow, ArrowRight } from "lucide-react";
import { nip19 } from "nostr-tools";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      features: [
        { text: "Customizable on-the-fly", icon: Zap },
        { text: "Inbox / Outbox support", icon: Globe },
        { text: "Public / Private modes", icon: Shield },
        { text: "Communities & DMs", icon: Radio },
      ],
      gradient: "from-blue-500/10 via-transparent to-transparent",
      accent: "border-blue-500/30",
      glow: "bg-blue-500/10",
    },
    {
      id: "premium" as const,
      name: "Premium",
      price: premiumPrice.toLocaleString(),
      description: "For power users who want the full experience",
      badge: true,
      features: [
        { text: "All Standard features", icon: Check },
        { text: "Relay-to-relay streaming", icon: Workflow },
        { text: "Social graph filtering", icon: Shield },
        { text: "Priority provisioning", icon: Sparkles },
      ],
      gradient: "from-primary/10 via-purple-500/5 to-transparent",
      accent: "border-primary/30",
      glow: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-10 pb-12 animate-fade-up">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="size-3.5" /> Deploy in under a minute
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Create Your <span className="text-gradient">Nostr Relay</span>
        </h1>
        <p className="mx-auto max-w-lg text-lg text-muted-foreground">
          Choose your plan, pick a name, and you're live. It's that simple.
        </p>
      </div>

      {/* Plan cards */}
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "group relative cursor-pointer overflow-hidden transition-all duration-500 hover:-translate-y-1",
              selectedPlan === plan.id
                ? `border-primary/40 bg-card/60 shadow-2xl shadow-primary/10 ring-1 ring-primary/20`
                : "border-border/30 bg-card/30 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
            )}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-50 transition-opacity duration-500 ${selectedPlan === plan.id ? "opacity-100" : "group-hover:opacity-75"}`} />

            {/* Glow blob */}
            <div className={`absolute -top-16 -right-16 size-40 rounded-full ${plan.glow} blur-3xl transition-opacity duration-500 ${selectedPlan === plan.id ? "opacity-60" : "opacity-0 group-hover:opacity-30"}`} />

            {/* Shimmer */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />

            {/* Badge */}
            {plan.badge && (
              <div className="absolute -top-px inset-x-0 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-b-lg bg-gradient-to-r from-primary to-purple-500 px-4 py-1 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20">
                  <Sparkles className="size-3" /> RECOMMENDED
                </span>
              </div>
            )}

            <CardContent className={`relative p-7 ${plan.badge ? "pt-9" : ""}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-bold">{plan.name}</h2>
                <div className={cn(
                  "size-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center",
                  selectedPlan === plan.id
                    ? "border-primary bg-primary scale-110"
                    : "border-muted-foreground/20 group-hover:border-muted-foreground/40"
                )}>
                  {selectedPlan === plan.id && (
                    <Check className="size-3.5 text-primary-foreground" />
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="mb-2">
                <span className={`text-5xl font-extrabold tracking-tight ${selectedPlan === plan.id ? "text-gradient" : "text-foreground"}`}>
                  {plan.price}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">sats</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm">
                    <div className="rounded-md bg-emerald-500/10 p-1">
                      <f.icon className="size-3.5 text-emerald-400" />
                    </div>
                    <span className="text-muted-foreground">{f.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Configure form */}
      <Card className="mx-auto max-w-4xl border-border/20 bg-card/30 backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <CardContent className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Configure Your Relay</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose a subdomain and deploy</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pubkey" className="text-sm font-medium">Your Pubkey</Label>
                <Input
                  id="pubkey"
                  value={user?.pubkey || ""}
                  placeholder="Sign in to auto-fill"
                  readOnly
                  className="font-mono text-xs bg-muted/30 border-border/30"
                />
                {!user && (
                  <p className="text-sm text-amber-400 flex items-center gap-1.5">
                    <Zap className="size-3.5" /> Sign in with NIP-07 to continue
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="relayname" className="text-sm font-medium">Relay Subdomain</Label>
                <div className="flex gap-2">
                  <Input
                    id="relayname"
                    placeholder="yourname"
                    autoComplete="off"
                    autoFocus
                    value={name}
                    onChange={(e) => validateName(e.target.value)}
                    className={cn(
                      "bg-muted/30 border-border/30",
                      nameError && "border-destructive focus-visible:ring-destructive",
                      name && !nameError && "border-emerald-500/30 focus-visible:ring-emerald-500/30"
                    )}
                  />
                  <div className="flex items-center rounded-lg border border-border/30 bg-muted/30 px-4 text-sm text-muted-foreground font-mono">
                    .{domain}
                  </div>
                </div>
                {nameError && <p className="text-sm text-destructive">{nameError}</p>}
                {name && !nameError && (
                  <div className="flex items-center gap-2 text-sm animate-fade-up">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-muted-foreground">
                      Your relay: <span className="font-bold text-gradient font-mono">{name}.{domain}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-fade-up">
                {error}
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                size="lg"
                className="gap-2.5 px-10 h-13 text-base bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 border-0 shadow-xl shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
                disabled={!isValid() || submitting}
              >
                {submitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    Deploy {selectedPlan === "premium" ? "Premium" : "Standard"} Relay
                    <ArrowRight className="size-4" />
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
