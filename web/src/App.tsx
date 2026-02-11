import { useEffect } from "react";
import { Routes, Route } from "react-router";
import { useAuth } from "./stores/auth";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import CreateRelay from "./pages/CreateRelay";
import MyRelays from "./pages/MyRelays";
import RelayDetail from "./pages/RelayDetail";
import RelaySettings from "./pages/RelaySettings";
import Invoices from "./pages/Invoices";
import Directory from "./pages/Directory";
import FAQ from "./pages/FAQ";

export default function App() {
  const checkAuth = useAuth((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="signup" element={<CreateRelay />} />
        <Route path="relays/myrelays" element={<MyRelays />} />
        <Route path="relays/:slug" element={<RelayDetail />} />
        <Route path="relays/:slug/settings" element={<RelaySettings />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="directory" element={<Directory />} />
        <Route path="faq" element={<FAQ />} />
      </Route>
    </Routes>
  );
}
