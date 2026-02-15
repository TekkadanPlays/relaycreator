import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { api } from "../lib/api";
import { authStore, type AuthState } from "../stores/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/Card";
import { Input } from "@/ui/Input";
import { Label } from "@/ui/Label";
import { Button } from "@/ui/Button";
import { Loader2, Check, Zap, AlertCircle, Radio } from "@/lib/icons";

interface CreateRelayState extends AuthState {
  name: string;
  loading: boolean;
  error: string;
  success: boolean;
  domain: string;
}

// TODO: Port full relay creation flow with plan selection, payment from React version
export default class CreateRelay extends Component<{}, CreateRelayState> {
  declare state: CreateRelayState;
  private unsub: (() => void) | null = null;

  constructor(props: {}) {
    super(props);
    this.state = { ...authStore.get(), name: "", loading: false, error: "", success: false, domain: "" };
  }

  componentDidMount() {
    this.unsub = authStore.subscribe((s) => this.setState(s as any));
    this.loadConfig();
  }

  componentWillUnmount() { this.unsub?.(); }

  private async loadConfig() {
    try {
      const config = await api.get<{ domain: string }>("/config");
      this.setState({ domain: config.domain });
    } catch { /* ignore */ }
  }

  private handleSubmit = async () => {
    const { name, user } = this.state;
    if (!name.trim() || !user) return;
    this.setState({ loading: true, error: "" });
    try {
      await api.post("/relays", { name: name.trim().toLowerCase() });
      this.setState({ success: true, loading: false });
    } catch (err: any) {
      this.setState({ error: err.message, loading: false });
    }
  };

  render() {
    const { name, loading, error, success, user, domain } = this.state;

    if (!user) {
      return createElement("div", { className: "flex flex-col items-center justify-center py-20 text-center space-y-4" },
        createElement(Radio, { className: "size-12 text-primary" }),
        createElement("h1", { className: "text-2xl font-bold" }, "Sign in to create a relay"),
        createElement("p", { className: "text-muted-foreground" }, "Connect your Nostr identity to get started."),
      );
    }

    if (success) {
      return createElement("div", { className: "flex flex-col items-center justify-center py-20 text-center space-y-4" },
        createElement(Check, { className: "size-12 text-primary" }),
        createElement("h1", { className: "text-2xl font-bold" }, "Relay Created!"),
        createElement("p", { className: "text-muted-foreground" }, `${name}.${domain} is being provisioned.`),
      );
    }

    return createElement("div", { className: "max-w-lg mx-auto space-y-6 animate-in" },
      createElement(Card, null,
        createElement(CardHeader, null,
          createElement(CardTitle, null, "Create a Relay"),
          createElement(CardDescription, null, "Choose a name for your new Nostr relay."),
        ),
        createElement(CardContent, { className: "space-y-4" },
          createElement("div", { className: "space-y-2" },
            createElement(Label, null, "Relay Name"),
            createElement("div", { className: "flex items-center gap-2" },
              createElement(Input, {
                placeholder: "myrelay",
                value: name,
                onInput: (e: Event) => this.setState({ name: (e.target as HTMLInputElement).value }),
              }),
              domain ? createElement("span", { className: "text-sm text-muted-foreground whitespace-nowrap" }, `.${domain}`) : null,
            ),
          ),
          error ? createElement("p", { className: "text-sm text-destructive flex items-center gap-1" },
            createElement(AlertCircle, { className: "size-4" }), error,
          ) : null,
          createElement(Button, { onClick: this.handleSubmit, disabled: loading || !name.trim(), className: "w-full gap-2" },
            loading ? createElement(Loader2, { className: "size-4 animate-spin" }) : createElement(Zap, { className: "size-4" }),
            "Create Relay",
          ),
        ),
      ),
    );
  }
}
