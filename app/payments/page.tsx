"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { SubscriptionPlanCreator } from "../components/SubscriptionPlanCreator";
import { listAdminPayments, type ApiPaymentIntent } from "../lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function statusClass(status: string) {
  const base = "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]";
  if (status === "succeeded") return `${base} bg-success/15 text-success`;
  if (status === "pending") return `${base} bg-warning/15 text-warning`;
  if (status === "failed") return `${base} bg-brand/15 text-brand`;
  return `${base} bg-text-disabled/25 text-text-muted`;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<ApiPaymentIntent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPayments(await listAdminPayments());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load payments.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPayments();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const totalRevenue = payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + parseFloat(p.amount_usd), 0);

  const kindCounts = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.kind] = (acc[p.kind] ?? 0) + 1;
    return acc;
  }, {});

  const revenueMix = Object.entries(kindCounts).map(([kind, count]) => {
    const kindTotal = payments
      .filter((p) => p.kind === kind && p.status === "succeeded")
      .reduce((sum, p) => sum + parseFloat(p.amount_usd), 0);
    const share = totalRevenue > 0 ? Math.round((kindTotal / totalRevenue) * 100) : 0;
    return { label: kind === "sub" ? "Subscription" : "Rental", amount: `$${kindTotal.toFixed(2)}`, share: `${share}%`, pct: share, count };
  });

  return (
    <AdminShell title="Payments and pricing">
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AdminCard title="Revenue mix">
          {isLoading ? (
            <p className="text-[13px] text-text-muted">Loading revenue data...</p>
          ) : revenueMix.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
              <p className="text-[13px] font-semibold text-text">No payment data yet</p>
              <p className="mt-1 text-[12px] text-text-muted">Revenue mix will appear once transactions come in.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {revenueMix.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-bold">{item.label}</span>
                    <span className="text-text-muted">
                      {item.amount} · {item.share}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard title="Recent transactions" action="Refresh" actionOnClick={loadPayments}>
          {error ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-4 text-[12px] text-warning">
              <div>{error}</div>
              <button type="button" onClick={loadPayments} className="mt-2 font-bold hover:underline">
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <p className="text-[13px] text-text-muted">Loading transactions...</p>
          ) : payments.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
              <p className="text-[13px] font-semibold text-text">No transactions yet</p>
              <p className="mt-1 text-[12px] text-text-muted">Payment intents will appear here once users start checking out.</p>
            </div>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-160 text-left">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-widest text-text-disabled">
                    <th className="px-5 pb-3 font-bold">Order</th>
                    <th className="px-5 pb-3 font-bold">Kind</th>
                    <th className="px-5 pb-3 font-bold">Amount</th>
                    <th className="px-5 pb-3 font-bold">Status</th>
                    <th className="px-5 pb-3 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.intent_id} className="text-[13px]">
                      <td className="px-5 py-4 font-bold">{p.order_id}</td>
                      <td className="px-5 py-4 text-text-muted capitalize">{p.kind === "sub" ? "Subscription" : "Rental"}</td>
                      <td className="px-5 py-4 text-text-muted">${p.amount_usd}</td>
                      <td className="px-5 py-4">
                        <span className={statusClass(p.status)}>{p.status}</span>
                      </td>
                      <td className="px-5 py-4 text-text-muted">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      <div className="mt-6">
        <SubscriptionPlanCreator />
      </div>
    </AdminShell>
  );
}
