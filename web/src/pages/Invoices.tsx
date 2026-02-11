import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Check, Clock, Loader2, FileX, Copy, ExternalLink, Radio, Zap, Settings } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OrderData {
  order: {
    id: string;
    status: string;
    paid: boolean;
    amount: number;
    lnurl: string;
    payment_hash: string;
    relay: {
      id: string;
      name: string;
      domain: string;
      status: string | null;
    };
  };
}

export default function Invoices() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", orderId],
    queryFn: () => api.get<OrderData>(`/invoices/${orderId}`),
    enabled: !!orderId,
    refetchInterval: 5000,
  });

  const [weblnPaying, setWeblnPaying] = useState(false);
  const [weblnAvailable, setWeblnAvailable] = useState(false);

  const copyInvoice = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const payWithWebLN = async (invoice: string) => {
    try {
      setWeblnPaying(true);
      await (window as any).webln.enable();
      await (window as any).webln.sendPayment(invoice);
    } catch (err) {
      console.log("WebLN payment failed or cancelled:", err);
    } finally {
      setWeblnPaying(false);
    }
  };

  // Auto-detect WebLN and attempt auto-pay
  useEffect(() => {
    if ((window as any).webln) {
      setWeblnAvailable(true);
    }
  }, []);

  useEffect(() => {
    const order = data?.order;
    if (order && !order.paid && order.lnurl && order.lnurl !== "0000" && weblnAvailable) {
      payWithWebLN(order.lnurl);
    }
  }, [data?.order?.lnurl, data?.order?.paid, weblnAvailable]);

  if (!orderId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FileX className="size-10 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-bold">No invoice selected</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create a relay to generate an invoice.</p>
        <Button className="mt-6 gap-2" asChild>
          <Link to="/signup">
            <Radio className="size-4" /> Create Relay
          </Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const order = data?.order;
  if (!order) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Invoice not found
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-8 animate-in">
      <Card>
        <CardContent className="flex flex-col items-center p-8 text-center">
          {order.paid ? (
            <>
              <div className="rounded-full bg-emerald-500/10 p-4 mb-5">
                <Check className="size-10 text-emerald-400" />
              </div>

              <h2 className="text-xl font-bold">Payment Confirmed</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your relay{" "}
                <span className="font-semibold text-foreground font-mono">
                  {order.relay.name}.{order.relay.domain}
                </span>{" "}
                {order.relay.status === "running" ? "is live." : "is being provisioned."}
              </p>

              <div className="mt-3">
                {order.relay.status === "running" ? (
                  <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1.5 bg-amber-500/10 text-amber-400 border-amber-500/20">
                    <Loader2 className="size-3 animate-spin" />
                    {order.relay.status === "provision" ? "Provisioning" : order.relay.status}
                  </Badge>
                )}
              </div>

              <div className="mt-6 flex gap-3 w-full">
                <Button className="flex-1 gap-1.5" asChild>
                  <Link to={`/relays/${order.relay.name}`}>
                    <Radio className="size-4" /> View Relay
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1 gap-1.5" asChild>
                  <Link to={`/relays/${order.relay.name}/settings`}>
                    <Settings className="size-4" /> Settings
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-full bg-amber-500/10 p-4 mb-5">
                <Clock className="size-10 text-amber-400" />
              </div>

              <h2 className="text-xl font-bold">Awaiting Payment</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pay <span className="font-semibold text-foreground">{order.amount.toLocaleString()} sats</span> to deploy{" "}
                <span className="font-semibold text-foreground font-mono">{order.relay.name}.{order.relay.domain}</span>
              </p>

              {order.lnurl && order.lnurl !== "0000" && (
                <div className="mt-6 space-y-4 w-full">
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-white p-4">
                      <QRCodeSVG value={order.lnurl} size={200} level="M" includeMargin={false} />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2 font-mono text-xs"
                    onClick={() => copyInvoice(order.lnurl)}
                  >
                    {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                    {copied ? "Copied!" : "Copy Invoice"}
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-1.5 text-sm" asChild>
                      <a href={`lightning:${order.lnurl}`}>
                        <ExternalLink className="size-3.5" /> Open in wallet
                      </a>
                    </Button>
                    {weblnAvailable && (
                      <Button
                        className="flex-1 gap-1.5"
                        onClick={() => payWithWebLN(order.lnurl)}
                        disabled={weblnPaying}
                      >
                        {weblnPaying ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                        {weblnPaying ? "Paying..." : "Pay with WebLN"}
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    <Loader2 className="size-3 animate-spin inline mr-1" />
                    Listening for payment...
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
