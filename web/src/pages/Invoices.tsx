import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Check, Clock, Loader2, FileX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", orderId],
    queryFn: () => api.get<OrderData>(`/invoices/${orderId}`),
    enabled: !!orderId,
    refetchInterval: 5000,
  });

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
                is being provisioned.
              </p>
              <Badge
                variant="secondary"
                className="mt-3"
              >
                Status: {order.relay.status}
              </Badge>
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
                <div className="mt-6 w-full rounded-lg bg-muted p-4">
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {order.lnurl}
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
