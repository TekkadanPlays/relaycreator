import { useState, useId } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../stores/auth";
import { api } from "../lib/api";
import { Check, Loader2, Zap, AlertCircle } from "lucide-react";
import { nip19 } from "nostr-tools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function CreateRelay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const radioId = useId();

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
      desc: "Personal relay with full customization",
      features: ["Customizable on-the-fly", "Inbox / Outbox support", "Public / Private modes", "Communities & DMs"],
    },
    {
      id: "premium" as const,
      label: "Premium",
      price: premiumPrice,
      desc: "Everything in Standard, plus advanced features",
      best: true,
      features: ["Relay-to-relay streaming", "Social graph filtering", "Priority provisioning"],
    },
  ];

  return (
    <div className="mx-auto max-w-xl py-6 animate-in">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">Create a Relay</CardTitle>
          <CardDescription>Choose a plan, pick a name, and you're live.</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* ── Plan Selection ── */}
            <fieldset className="space-y-3">
              <Label className="text-sm font-medium">Plan</Label>
              <RadioGroup
                value={selectedPlan}
                onValueChange={(v) => setSelectedPlan(v as "standard" | "premium")}
                className="gap-0 rounded-lg border"
              >
                {plans.map((plan, i) => (
                  <label
                    key={plan.id}
                    className={cn(
                      "relative flex cursor-pointer gap-4 px-4 py-3 transition-colors",
                      "has-data-[state=checked]:bg-accent",
                      i > 0 && "border-t"
                    )}
                  >
                    <RadioGroupItem
                      value={plan.id}
                      id={`${radioId}-${plan.id}`}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{plan.label}</span>
                        {plan.best && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                            Best value
                          </Badge>
                        )}
                        <span className="ml-auto text-sm font-bold tabular-nums">
                          {plan.price.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">sats</span>
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.desc}</p>
                      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Check className="size-3 text-emerald-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </fieldset>

            <Separator />

            {/* ── Relay Name ── */}
            <div className="space-y-2">
              <Label htmlFor="relayname">Relay name</Label>
              <div className="flex">
                <Input
                  id="relayname"
                  placeholder="myrelay"
                  autoComplete="off"
                  autoFocus
                  value={name}
                  onChange={(e) => validateName(e.target.value)}
                  className={cn(
                    "rounded-r-none border-r-0",
                    nameError && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <div className="flex items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm text-muted-foreground font-mono">
                  .{domain}
                </div>
              </div>
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
              {name && !nameError && (
                <p className="text-xs text-muted-foreground">
                  Your relay will be available at{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
                    wss://{name}.{domain}
                  </code>
                </p>
              )}
            </div>

            {/* ── Pubkey (read-only context) ── */}
            {user && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Owner pubkey</Label>
                <p className="truncate rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                  {user.pubkey}
                </p>
              </div>
            )}

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
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full gap-2" size="lg" disabled={!isValid() || submitting}>
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
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
