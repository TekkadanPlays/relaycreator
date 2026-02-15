import { type CoinosPayment } from "../../lib/coinos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

interface HistorySectionProps {
  payments: CoinosPayment[];
  totalPayments: number;
  page: number;
  pageSize: number;
  formatSats: (n: number) => string;
  satsToUsd: (n: number) => string | null;
  formatDate: (ts: number) => string;
  paymentTypeLabel: (p: CoinosPayment) => string;
  onPageChange: (page: number) => void;
}

export default function HistorySection({
  payments,
  totalPayments,
  page,
  pageSize,
  formatSats,
  satsToUsd,
  formatDate,
  paymentTypeLabel,
  onPageChange,
}: HistorySectionProps) {
  const totalPages = Math.ceil(totalPayments / pageSize);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Transaction History</h2>
        <p className="text-sm text-muted-foreground">
          {totalPayments > 0
            ? `${totalPayments.toLocaleString()} transaction${totalPayments !== 1 ? "s" : ""}`
            : "No transactions yet"}
        </p>
      </div>

      {payments.length > 0 ? (
        <>
          <div className="space-y-0.5">
            {payments.map((p, i) => (
              <div
                key={p.id || i}
                className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-accent/30 transition-colors"
              >
                {p.amount > 0 ? (
                  <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
                    <ArrowDownLeft className="size-4 text-emerald-500" />
                  </div>
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-full bg-orange-500/10 shrink-0">
                    <ArrowUpRight className="size-4 text-orange-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{paymentTypeLabel(p)}</p>
                    {p.type && (
                      <span className="text-[10px] rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground shrink-0 capitalize">
                        {p.type}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDate(p.created)}
                    {p.memo && ` · ${p.memo}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "text-sm font-mono font-semibold tabular-nums",
                      p.amount > 0 ? "text-emerald-500" : "text-orange-500"
                    )}
                  >
                    {p.amount > 0 ? "+" : "-"}
                    {formatSats(p.amount)}
                  </p>
                  {satsToUsd(p.amount) && (
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {satsToUsd(p.amount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 0}
                className="gap-1"
              >
                <ChevronLeft className="size-3.5" /> Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="gap-1"
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Clock className="size-6 text-muted-foreground/40" />
          </div>
          <p className="font-medium">No transactions yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your payment history will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
