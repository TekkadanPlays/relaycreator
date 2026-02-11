import { useState } from "react";
import { useSearchParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Check, Clock, Loader2, FileX, Copy, ExternalLink, Radio } from "lucide-react";
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

  const copyInvoice = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!orderId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FileX className="size-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold">No invoice selected</h2>
        <p className="mt-2 text-muted-foreground">Create a relay to generate an invoice.</p>
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
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Invoice not found
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card>
        <CardContent className="flex flex-col items-center p-8 text-center">
          {order.paid ? (
            <>
              <div className="mb-4 rounded-full bg-emerald-500/10 p-4">
                <Check className="size-12 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold">Payment Confirmed!</h2>
              <p className="mt-2 text-muted-foreground">
                Your relay{" "}
                <span className="font-bold text-primary">
                  {order.relay.name}.{order.relay.domain}
                </span>{" "}
                {order.relay.status === "running" ? "is live!" : "is being provisioned."}
              </p>
              <Badge
                variant={order.relay.status === "running" ? "default" : "secondary"}
                className={order.relay.status === "running" ? "mt-3 bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "mt-3"}
              >
                {order.relay.status === "running" ? "Running" : `Status: ${order.relay.status}`}
              </Badge>
              <div className="mt-6 flex gap-3">
                <Button asChild className="gap-1.5">
                  <Link to={`/relays/${order.relay.name}`}>
                    <Radio className="size-4" /> View Relay
                  </Link>
                </Button>
                <Button variant="outline" asChild className="gap-1.5">
                  <Link to={`/relays/${order.relay.name}/settings`}>
                    Settings
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 rounded-full bg-amber-500/10 p-4">
                <Clock className="size-12 animate-pulse text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold">Awaiting Payment</h2>
              <p className="mt-2 text-muted-foreground">
                Pay <span className="font-bold text-foreground">{order.amount} sats</span> to provision{" "}
                <span className="font-bold text-primary">
                  {order.relay.name}.{order.relay.domain}
                </span>
              </p>
              {order.lnurl && order.lnurl !== "0000" && (
                <div className="mt-6 space-y-4 w-full">
                  <div className="flex justify-center rounded-xl bg-white p-4">
                    <QRCodeSVG
                      value={order.lnurl}
                      size={220}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full gap-2 font-mono text-xs"
                    onClick={() => copyInvoice(order.lnurl)}
                  >
                    {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                    {copied ? "Copied!" : "Copy Invoice"}
                  </Button>
                  <a
                    href={`lightning:${order.lnurl}`}
                    className="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5" /> Open in wallet
                  </a>
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Checking for payment...
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
