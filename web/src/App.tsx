import { useEffect, lazy, Suspense } from "react";
import { Routes, Route } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "./stores/auth";
import Layout from "./components/Layout";
import Home from "./pages/Home";

const CreateRelay = lazy(() => import("./pages/CreateRelay"));
const MyRelays = lazy(() => import("./pages/MyRelays"));
const RelayDetail = lazy(() => import("./pages/RelayDetail"));
const RelaySettings = lazy(() => import("./pages/RelaySettings"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Directory = lazy(() => import("./pages/Directory"));
const FAQ = lazy(() => import("./pages/FAQ"));

function PageLoader() {
  return (
    <div className="flex justify-center py-24">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function App() {
  const checkAuth = useAuth((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
  );
}
