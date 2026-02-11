import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Check, Clock, Loader2, FileX, Copy, ExternalLink, Radio, Zap, Settings, Sparkles, ArrowRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-up">
        <div className="rounded-2xl bg-muted/30 p-6 mb-4">
          <FileX className="size-12 text-muted-foreground/30" />
        </div>
        <h2 className="text-2xl font-bold">No invoice selected</h2>
        <p className="mt-2 text-muted-foreground">Create a relay to generate an invoice.</p>
        <Button className="mt-6 gap-2 bg-gradient-to-r from-primary to-purple-500 border-0" asChild>
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
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const order = data?.order;
  if (!order) {
    return (
      <div className="mx-auto max-w-lg animate-fade-up">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Invoice not found
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-8 animate-fade-up">
      <Card className="relative overflow-hidden border-border/20 bg-card/40 backdrop-blur-sm">
        {/* Top accent */}
        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${order.paid ? "via-emerald-500/50" : "via-amber-500/50"} to-transparent`} />

        {/* Background glow */}
        <div className={`absolute -top-20 left-1/2 -translate-x-1/2 size-48 rounded-full blur-3xl ${order.paid ? "bg-emerald-500/10" : "bg-amber-500/10"}`} />

        <CardContent className="relative flex flex-col items-center p-8 sm:p-10 text-center">
          {order.paid ? (
            <>
              {/* Success state */}
              <div className="relative mb-6">
                <div className="rounded-full bg-emerald-500/10 p-5 animate-scale-in">
                  <Check className="size-12 text-emerald-400" />
                </div>
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse-ring" />
              </div>

              <h2 className="text-2xl font-bold animate-fade-up">Payment Confirmed!</h2>
              <p className="mt-3 text-muted-foreground animate-fade-up delay-100">
                Your relay{" "}
                <span className="font-bold text-gradient">
                  {order.relay.name}.{order.relay.domain}
                </span>{" "}
                {order.relay.status === "running" ? "is live and ready!" : "is being provisioned..."}
              </p>

              {/* Status indicator */}
              <div className="mt-4 animate-fade-up delay-200">
                {order.relay.status === "running" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-medium text-emerald-400 border border-emerald-500/20">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                    </span>
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-1.5 text-sm font-medium text-amber-400 border border-amber-500/20">
                    <Loader2 className="size-3.5 animate-spin" />
                    {order.relay.status === "provision" ? "Provisioning..." : order.relay.status}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="mt-8 flex gap-3 w-full animate-fade-up delay-300">
                <Button className="flex-1 gap-1.5 bg-gradient-to-r from-primary to-purple-500 border-0 shadow-lg shadow-primary/20" asChild>
                  <Link to={`/relays/${order.relay.name}`}>
                    <Radio className="size-4" /> View Relay
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1 gap-1.5 border-border/30 hover:border-primary/30" asChild>
                  <Link to={`/relays/${order.relay.name}/settings`}>
                    <Settings className="size-4" /> Settings
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Pending state */}
              <div className="relative mb-6">
                <div className="rounded-full bg-amber-500/10 p-5">
                  <Clock className="size-12 text-amber-400 animate-pulse" />
                </div>
              </div>

              <h2 className="text-2xl font-bold">Awaiting Payment</h2>
              <p className="mt-3 text-muted-foreground">
                Pay{" "}
                <span className="inline-flex items-center gap-1 font-bold text-gradient-amber">
                  <Zap className="size-3.5" /> {order.amount.toLocaleString()} sats
                </span>{" "}
                to deploy{" "}
                <span className="font-bold text-gradient">
                  {order.relay.name}.{order.relay.domain}
                </span>
              </p>

              {order.lnurl && order.lnurl !== "0000" && (
                <div className="mt-8 space-y-4 w-full">
                  {/* QR Code */}
                  <div className="relative flex justify-center">
                    <div className="rounded-2xl bg-white p-5 shadow-xl shadow-black/10">
                      <QRCodeSVG
                        value={order.lnurl}
                        size={220}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  </div>

                  {/* Copy button */}
                  <Button
                    variant="outline"
                    className="w-full gap-2 font-mono text-xs border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all"
                    onClick={() => copyInvoice(order.lnurl)}
                  >
                    {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                    {copied ? "Copied to clipboard!" : "Copy Lightning Invoice"}
                  </Button>

                  {/* Payment actions */}
                  <div className="flex gap-2">
                    <a
                      href={`lightning:${order.lnurl}`}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/30 px-3 py-2.5 text-sm hover:bg-muted/50 hover:border-primary/30 transition-all"
                    >
                      <ExternalLink className="size-3.5" /> Open in wallet
                    </a>
                    {weblnAvailable && (
                      <Button
                        className="flex-1 gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-500/90 hover:to-orange-500/90 border-0 shadow-lg shadow-amber-500/20 text-white"
                        onClick={() => payWithWebLN(order.lnurl)}
                        disabled={weblnPaying}
                      >
                        {weblnPaying ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                        {weblnPaying ? "Paying..." : "Pay with WebLN"}
                      </Button>
                    )}
                  </div>

                  {/* Polling indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60 pt-2">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                    </span>
                    Listening for payment...
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
