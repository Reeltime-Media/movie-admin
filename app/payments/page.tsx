"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { AdminPagination } from "../components/AdminPagination";
import { listAdminPayments, type ApiPaymentIntent } from "../lib/api";

const PAGE_SIZE = 20;

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

function paymentTypeLabel(kind: string) {
  if (kind === "sub") return "subscription-plan";
  return "single-movie";
}

function userLabel(payment: ApiPaymentIntent) {
  if (payment.user_full_name) {
    return (
      <>
        <span className="font-semibold text-text">{payment.user_full_name}</span>
        <span className="block text-[11px] text-text-muted">{payment.user_email}</span>
      </>
    );
  }
  return <span className="text-text">{payment.user_email}</span>;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<ApiPaymentIntent[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listAdminPayments({ page: targetPage, pageSize: PAGE_SIZE });
      setPayments(res.items);
      setPage(res.page);
      setPages(res.pages);
      setTotal(res.total);
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
      void loadPayments(page);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [page]);

  return (
    <AdminShell title="Payments">
      <AdminCard
        title="Recent transactions"
          action="Refresh"
          actionOnClick={() => loadPayments(page)}
        >
          {error ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-4 text-[12px] text-warning">
              <div>{error}</div>
              <button
                type="button"
                onClick={() => loadPayments(page)}
                className="mt-2 font-bold hover:underline"
              >
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <p className="text-[13px] text-text-muted">Loading transactions...</p>
          ) : payments.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
              <p className="text-[13px] font-semibold text-text">No transactions yet</p>
              <p className="mt-1 text-[12px] text-text-muted">
                Payment intents will appear here once users start checking out.
              </p>
            </div>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-180 text-left">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-widest text-text-disabled">
                    <th className="px-5 pb-3 font-bold">User</th>
                    <th className="px-5 pb-3 font-bold">Order</th>
                    <th className="px-5 pb-3 font-bold">Type</th>
                    <th className="px-5 pb-3 font-bold">Amount</th>
                    <th className="px-5 pb-3 font-bold">Status</th>
                    <th className="px-5 pb-3 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.intent_id} className="text-[13px]">
                      <td className="px-5 py-4">{userLabel(p)}</td>
                      <td className="px-5 py-4 font-bold">{p.order_id}</td>
                      <td className="px-5 py-4 text-text-muted">
                        {paymentTypeLabel(p.kind)}
                      </td>
                      <td className="px-5 py-4 text-text-muted">${p.amount_usd}</td>
                      <td className="px-5 py-4">
                        <span className={statusClass(p.status)}>{p.status}</span>
                      </td>
                      <td className="px-5 py-4 text-text-muted">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <AdminPagination
                page={page}
                pages={pages}
                total={total}
                pageSize={PAGE_SIZE}
                isLoading={isLoading}
                onPageChange={setPage}
              />
            </div>
          )}
      </AdminCard>
    </AdminShell>
  );
}
