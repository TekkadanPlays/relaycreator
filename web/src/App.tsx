import { Component } from "inferno";
import { createElement } from "inferno-create-element";
import { Route, Switch, Redirect } from "inferno-router";
import { checkAuth, authStore, type AuthState } from "./stores/auth";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import CreateRelay from "./pages/CreateRelay";
import RelayDetail from "./pages/RelayDetail";
import RelaySettings from "./pages/RelaySettings";
import Invoices from "./pages/Invoices";
import Directory from "./pages/Directory";
import FAQ from "./pages/FAQ";
import Wallet from "./pages/Wallet";
import Admin from "./pages/Admin";
import Discover from "./pages/Discover";
import RelayManager from "./pages/RelayManager";
import { Docs } from "./pages/docs/DocsRouter";
import { Toaster } from "@/ui/Toast";

export default class App extends Component<{}, AuthState> {
  declare state: AuthState;
  private unsub: (() => void) | null = null;

  constructor(props: {}) {
    super(props);
    this.state = authStore.get();
  }

  componentDidMount() {
    this.unsub = authStore.subscribe((s) => this.setState(s));
    checkAuth();
  }

  componentWillUnmount() {
    this.unsub?.();
  }

  render() {
    return createElement("div", null,
      createElement(Layout, null,
        createElement(Switch, null,
          createElement(Route, { exact: true, path: "/", component: Home }),
          createElement(Route, { path: "/signup", component: CreateRelay }),
          createElement(Route, { path: "/relays/myrelays", render: () => createElement(Redirect, { to: "/admin" }) }),
          createElement(Route, { path: "/relays/:slug/settings", component: RelaySettings }),
          createElement(Route, { path: "/relays/:slug", component: RelayDetail }),
          createElement(Route, { path: "/invoices", component: Invoices }),
          createElement(Route, { path: "/directory", component: Directory }),
          createElement(Route, { path: "/faq", component: FAQ }),
          createElement(Route, { path: "/wallet", component: Wallet }),
          createElement(Route, { path: "/admin", component: Admin }),
          createElement(Route, { path: "/discover", component: Discover }),
          createElement(Route, { exact: true, path: "/relays", component: RelayManager }),
          createElement(Route, { path: "/docs/:rest*", component: Docs }),
          createElement(Route, { path: "/docs", component: Docs }),
        ),
      ),
      createElement(Toaster, null),
    );
  }
}
