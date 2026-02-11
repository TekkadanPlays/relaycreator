import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Check, Clock } from "lucide-react";

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
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">No invoice selected</h2>
        <p className="text-base-content/60 mt-2">Create a relay to generate an invoice.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg" /></div>;
  }

  const order = data?.order;
  if (!order) {
    return <div className="alert alert-error">Invoice not found</div>;
  }

  return (
    <div className="max-w-lg mx-auto py-10">
      <div className="card bg-base-200">
        <div className="card-body items-center text-center">
          {order.paid ? (
            <>
              <Check className="w-16 h-16 text-success mb-4" />
              <h2 className="card-title text-2xl">Payment Confirmed!</h2>
              <p className="text-base-content/60">
                Your relay <span className="font-bold text-primary">{order.relay.name}.{order.relay.domain}</span> is being provisioned.
              </p>
              <p className="text-sm text-base-content/40 mt-2">Status: {order.relay.status}</p>
            </>
          ) : (
            <>
              <Clock className="w-16 h-16 text-warning mb-4 animate-pulse" />
              <h2 className="card-title text-2xl">Awaiting Payment</h2>
              <p className="text-base-content/60 mb-4">
                Pay <span className="font-bold">{order.amount} sats</span> to provision{" "}
                <span className="font-bold text-primary">{order.relay.name}.{order.relay.domain}</span>
              </p>
              {order.lnurl && order.lnurl !== "0000" && (
                <div className="w-full">
                  <div className="bg-base-300 p-3 rounded-md break-all text-xs font-mono max-h-32 overflow-y-auto">
                    {order.lnurl}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
