import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { api } from "../lib/api";
import { authStore, login, type AuthState } from "../stores/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/Card";
import { Input } from "@/ui/Input";
import { Label } from "@/ui/Label";
import { Button } from "@/ui/Button";
import { Badge } from "@/ui/Badge";
import { Separator } from "@/ui/Separator";
import { Loader2, Check, Zap, AlertCircle, Radio, Shield, Globe, User, KeyRound, Clock } from "@/lib/icons";
import { cn } from "@/ui/utils";

type Plan = "standard" | "premium";
type Step = "pricing" | "configure" | "success";

interface SiteConfig {
  domain: string;
  payments_enabled: boolean;
  invoice_amount: number;
  invoice_premium_amount: number;
}

interface Eligibility {
  eligible: boolean;
  reason?: string;
  relaysOwned: number;
  relayQuota: number | null;
  canRequest: boolean;
  hasPendingRequest?: boolean;
}

interface CreateRelayState extends AuthState {
  step: Step;
  plan: Plan;
  name: string;
  loading: boolean;
  error: string;
  config: SiteConfig | null;
  eligibility: Eligibility | null;
  eligibilityLoading: boolean;
  requestingAccess: boolean;
  requestSent: boolean;
}

export default class CreateRelay extends Component<{}, CreateRelayState> {
  declare state: CreateRelayState;
  private unsub: (() => void) | null = null;

  constructor(props: {}) {
    super(props);
    this.state = {
      ...authStore.get(),
      step: "pricing", plan: "standard", name: "",
      loading: false, error: "", config: null,
      eligibility: null, eligibilityLoading: false,
      requestingAccess: false, requestSent: false,
    };
  }

  componentDidMount() {
    this.unsub = authStore.subscribe((s) => {
      this.setState(s as any);
      // Check eligibility when user signs in
      if (s.user && !this.state.eligibility && !this.state.eligibilityLoading) {
        this.checkEligibility();
      }
    });
    this.loadConfig();
    if (authStore.get().user) this.checkEligibility();
  }

  componentWillUnmount() { this.unsub?.(); }

  private async loadConfig() {
    try {
      const config = await api.get<SiteConfig>("/config");
      this.setState({ config });
    } catch { /* ignore */ }
  }

  private async checkEligibility() {
    this.setState({ eligibilityLoading: true });
    try {
      const elig = await api.get<Eligibility>("/permissions/relay-eligibility");
      this.setState({ eligibility: elig, eligibilityLoading: false });
    } catch {
      this.setState({ eligibilityLoading: false });
    }
  }

  private requestOperatorAccess = async () => {
    this.setState({ requestingAccess: true });
    try {
      await api.post("/permissions/request", {
        type: "operator",
        reason: "I would like to operate relays on mycelium.",
      });
      this.setState({ requestSent: true, requestingAccess: false });
      this.checkEligibility();
    } catch (err: any) {
      this.setState({ error: err.message || "Failed to submit request", requestingAccess: false });
    }
  };

  private selectPlan = (plan: Plan) => {
    this.setState({ plan, step: "configure", error: "" });
  };

  private handleSubmit = async () => {
    const { name, plan, user } = this.state;
    if (!name.trim() || !user) return;
    this.setState({ loading: true, error: "" });
    try {
      await api.post("/relays", { name: name.trim().toLowerCase(), plan });
      this.setState({ step: "success", loading: false });
    } catch (err: any) {
      this.setState({ error: err.message, loading: false });
    }
  };

  render() {
    const { step, plan, name, loading, error, user, config } = this.state;
    const domain = config?.domain || "";
    const paymentsEnabled = config?.payments_enabled ?? false;
    const standardPrice = config?.invoice_amount ?? 21;
    const premiumPrice = config?.invoice_premium_amount ?? 2100;

    const { eligibility, eligibilityLoading, requestingAccess, requestSent } = this.state;

    // Not signed in
    if (!user) {
      return createElement("div", { className: "flex flex-col items-center justify-center py-20 text-center space-y-4" },
        createElement(Radio, { className: "size-12 text-primary" }),
        createElement("h1", { className: "text-2xl font-bold" }, "Create a Nostr Relay"),
        createElement("p", { className: "text-muted-foreground max-w-md" }, "Sign in with your Nostr identity to create and manage your own relay."),
        createElement(Button, { onClick: () => login(), size: "lg", className: "gap-2 mt-2" },
          createElement(User, { className: "size-4" }), "Sign In",
        ),
      );
    }

    // Loading eligibility
    if (eligibilityLoading || !eligibility) {
      return createElement("div", { className: "flex flex-col items-center justify-center py-20" },
        createElement(Loader2, { className: "size-8 animate-spin text-muted-foreground" }),
      );
    }

    // Not eligible — no operator permission
    if (!eligibility.eligible) {
      return createElement("div", { className: "max-w-lg mx-auto text-center py-16 space-y-6 animate-in" },
        createElement("div", { className: "size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto" },
          createElement(Shield, { className: "size-8 text-primary" }),
        ),
        createElement("h1", { className: "text-2xl font-bold" }, "Operator Access Required"),
        createElement("p", { className: "text-muted-foreground max-w-md mx-auto leading-relaxed" },
          eligibility.reason,
        ),

        // Quota info if they have permission but hit the limit
        eligibility.relayQuota !== null && eligibility.relayQuota > 0
          ? createElement("div", { className: "rounded-lg border border-border/50 p-4 text-sm" },
              createElement("div", { className: "flex justify-between" },
                createElement("span", { className: "text-muted-foreground" }, "Relays owned"),
                createElement("span", { className: "font-semibold" }, String(eligibility.relaysOwned)),
              ),
              createElement("div", { className: "flex justify-between mt-1" },
                createElement("span", { className: "text-muted-foreground" }, "Relay quota"),
                createElement("span", { className: "font-semibold" }, String(eligibility.relayQuota)),
              ),
            )
          : null,

        // Pending request notice
        eligibility.hasPendingRequest
          ? createElement("div", { className: "flex items-center justify-center gap-2 text-sm text-amber-400" },
              createElement(Clock, { className: "size-4" }),
              "Your operator request is pending review.",
            )
          : null,

        // Request access button
        eligibility.canRequest && !requestSent
          ? createElement(Card, { className: "text-left" },
              createElement(CardContent, { className: "p-5 space-y-3" },
                createElement("h3", { className: "font-semibold text-sm" }, "Request Operator Access"),
                createElement("p", { className: "text-xs text-muted-foreground" },
                  "Submit a request to the platform administrator. Once approved, you'll be able to create and manage your own relays.",
                ),
                error ? createElement("p", { className: "text-xs text-destructive" }, error) : null,
                createElement(Button, {
                  onClick: this.requestOperatorAccess,
                  disabled: requestingAccess,
                  className: "w-full gap-2",
                },
                  requestingAccess
                    ? createElement(Loader2, { className: "size-4 animate-spin" })
                    : createElement(KeyRound, { className: "size-4" }),
                  "Request Access",
                ),
              ),
            )
          : null,

        // Request sent confirmation
        requestSent
          ? createElement("div", { className: "flex items-center justify-center gap-2 text-sm text-emerald-400" },
              createElement(Check, { className: "size-4" }),
              "Request submitted! An administrator will review it shortly.",
            )
          : null,

        createElement(Button, {
          variant: "outline", className: "gap-2",
          onClick: () => { window.location.href = "/admin"; },
        },
          createElement(Shield, { className: "size-4" }), "Go to Admin Panel",
        ),
      );
    }

    // Success
    if (step === "success") {
      return createElement("div", { className: "flex flex-col items-center justify-center py-20 text-center space-y-4" },
        createElement("div", { className: "size-16 rounded-full bg-primary/10 flex items-center justify-center" },
          createElement(Check, { className: "size-8 text-primary" }),
        ),
        createElement("h1", { className: "text-2xl font-bold" }, "Relay Created!"),
        createElement("p", { className: "text-muted-foreground" },
          createElement("span", { className: "font-mono font-semibold text-foreground" }, `${name}.${domain}`),
          " is being provisioned.",
        ),
        createElement("p", { className: "text-xs text-muted-foreground" }, "Your relay will be ready in a few moments."),
        createElement(Button, { onClick: () => { window.location.href = "/admin"; }, variant: "outline", className: "gap-2 mt-2" },
          createElement(Shield, { className: "size-4" }), "Go to Admin Panel",
        ),
      );
    }

    // Pricing step
    if (step === "pricing") {
      return createElement("div", { className: "max-w-3xl mx-auto space-y-8 animate-in" },
        // Header
        createElement("div", { className: "text-center space-y-2" },
          createElement("h1", { className: "text-3xl font-extrabold tracking-tight" }, "Create a Relay"),
          createElement("p", { className: "text-muted-foreground max-w-lg mx-auto" },
            "Choose a plan for your Nostr relay. All relays include a custom subdomain, NIP-11 metadata, and full admin controls.",
          ),
        ),

        // Plan cards
        createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
          // Standard
          this.renderPlanCard({
            name: "Standard",
            price: paymentsEnabled ? standardPrice : 0,
            description: "Perfect for personal use or small communities.",
            features: [
              "Custom subdomain",
              "NIP-11 relay info",
              "Admin dashboard",
              "Access control lists",
              "Relay directory listing",
            ],
            plan: "standard",
            recommended: false,
          }),
          // Premium
          this.renderPlanCard({
            name: "Premium",
            price: paymentsEnabled ? premiumPrice : 0,
            description: "For power users who need advanced features.",
            features: [
              "Everything in Standard",
              "Payment-gated access",
              "Auth-required relay",
              "Priority provisioning",
              "Extended storage",
            ],
            plan: "premium",
            recommended: true,
          }),
        ),

        // Free note
        !paymentsEnabled
          ? createElement("p", { className: "text-center text-xs text-muted-foreground" },
              "Payments are currently disabled. All relays are free during the beta period.",
            )
          : null,
      );
    }

    // Configure step
    return createElement("div", { className: "max-w-lg mx-auto space-y-6 animate-in" },
      // Back to pricing
      createElement("button", {
        onClick: () => this.setState({ step: "pricing", error: "" }),
        className: "text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1",
      }, "\u2190 Back to plans"),

      createElement(Card, null,
        createElement(CardHeader, null,
          createElement("div", { className: "flex items-center justify-between" },
            createElement(CardTitle, null, "Configure Your Relay"),
            createElement(Badge, { variant: plan === "premium" ? "default" : "secondary" },
              plan === "premium" ? "Premium" : "Standard",
            ),
          ),
          createElement(CardDescription, null, "Choose a name for your new Nostr relay."),
        ),
        createElement(CardContent, { className: "space-y-4" },
          createElement("div", { className: "space-y-2" },
            createElement(Label, null, "Relay Name"),
            createElement("div", { className: "flex items-center gap-0" },
              createElement(Input, {
                placeholder: "myrelay",
                value: name,
                onInput: (e: Event) => this.setState({ name: (e.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9-]/g, "") }),
                className: "rounded-r-none",
              }),
              domain
                ? createElement("div", { className: "flex items-center h-9 px-3 border border-l-0 border-input rounded-r-md bg-muted text-sm text-muted-foreground whitespace-nowrap" }, `.${domain}`)
                : null,
            ),
            name && domain
              ? createElement("p", { className: "text-xs text-muted-foreground" },
                  "Your relay will be available at ",
                  createElement("span", { className: "font-mono font-medium text-foreground" }, `wss://${name}.${domain}`),
                )
              : null,
          ),

          createElement(Separator, null),

          // Summary
          createElement("div", { className: "space-y-2 text-sm" },
            createElement("div", { className: "flex justify-between" },
              createElement("span", { className: "text-muted-foreground" }, "Plan"),
              createElement("span", { className: "font-medium capitalize" }, plan),
            ),
            paymentsEnabled
              ? createElement("div", { className: "flex justify-between" },
                  createElement("span", { className: "text-muted-foreground" }, "Price"),
                  createElement("span", { className: "font-medium" },
                    (plan === "premium" ? premiumPrice : standardPrice) + " sats",
                  ),
                )
              : createElement("div", { className: "flex justify-between" },
                  createElement("span", { className: "text-muted-foreground" }, "Price"),
                  createElement("span", { className: "font-medium text-primary" }, "Free (beta)"),
                ),
          ),

          error
            ? createElement("p", { className: "text-sm text-destructive flex items-center gap-1.5" },
                createElement(AlertCircle, { className: "size-4 shrink-0" }), error,
              )
            : null,

          createElement(Button, {
            onClick: this.handleSubmit,
            disabled: loading || !name.trim(),
            className: "w-full gap-2",
          },
            loading
              ? createElement(Loader2, { className: "size-4 animate-spin" })
              : createElement(Zap, { className: "size-4" }),
            paymentsEnabled ? "Create & Pay" : "Create Relay",
          ),
        ),
      ),
    );
  }

  private renderPlanCard(opts: {
    name: string; price: number; description: string;
    features: string[]; plan: Plan; recommended: boolean;
  }) {
    const { plan: selectedPlan } = this.state;
    const isSelected = selectedPlan === opts.plan;

    return createElement("div", {
      key: opts.plan,
      onClick: () => this.selectPlan(opts.plan),
      className: cn(
        "relative rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-md",
        opts.recommended ? "border-primary shadow-sm" : "border-border hover:border-primary/30",
      ),
    },
      // Recommended badge
      opts.recommended
        ? createElement("div", { className: "absolute -top-3 left-1/2 -translate-x-1/2" },
            createElement(Badge, { className: "shadow-sm" }, "Recommended"),
          )
        : null,

      // Plan name + price
      createElement("div", { className: "mb-4" },
        createElement("h3", { className: "text-lg font-bold" }, opts.name),
        createElement("p", { className: "text-sm text-muted-foreground mt-1" }, opts.description),
      ),

      // Price
      createElement("div", { className: "mb-4" },
        opts.price > 0
          ? createElement("div", { className: "flex items-baseline gap-1" },
              createElement("span", { className: "text-3xl font-extrabold" }, String(opts.price)),
              createElement("span", { className: "text-sm text-muted-foreground" }, "sats"),
            )
          : createElement("div", { className: "flex items-baseline gap-1" },
              createElement("span", { className: "text-3xl font-extrabold text-primary" }, "Free"),
              createElement("span", { className: "text-sm text-muted-foreground" }, "during beta"),
            ),
      ),

      createElement(Separator, { className: "mb-4" }),

      // Features
      createElement("ul", { className: "space-y-2" },
        ...opts.features.map((f) =>
          createElement("li", { key: f, className: "flex items-center gap-2 text-sm" },
            createElement(Check, { className: "size-3.5 text-primary shrink-0" }),
            f,
          ),
        ),
      ),

      // Select button
      createElement(Button, {
        variant: opts.recommended ? "default" : "outline",
        className: "w-full mt-6 gap-2",
        onClick: (e: Event) => { e.stopPropagation(); this.selectPlan(opts.plan); },
      },
        createElement(Zap, { className: "size-4" }),
        "Select " + opts.name,
      ),
    );
  }
}
