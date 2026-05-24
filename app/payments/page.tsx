"use client";

import { useEffect, useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { InlineLoading } from "../components/InlineLoading";
import { AdminShell } from "../components/AdminShell";
import { AdminPagination } from "../components/AdminPagination";
import { usePayments } from "../hooks/adminQueries";
import { type ApiPaymentIntent } from "../lib/api";

const PAGE_SIZE = 20;

const inputClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated";

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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasFilters = Boolean(debouncedSearch || dateFrom || dateTo);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFrom, dateTo]);

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = usePayments({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const payments = data?.items ?? [];
  const pages = data?.pages ?? 1;
  const total = data?.total ?? 0;
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Could not load payments."
    : null;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <AdminShell title="Payments">
      <AdminCard
        title="Recent transactions"
        action="Refresh"
        actionOnClick={() => void refetch()}
      >
        <div className="mb-5 flex flex-col gap-3 border-b border-border pb-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block sm:col-span-2 lg:col-span-2">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-text-disabled">
                Search user
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or email"
                className={inputClass}
                autoComplete="off"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-text-disabled">
                From date
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-text-disabled">
                To date
              </span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          {hasFilters ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] text-text-muted">
                {isFetching ? "Filtering…" : `${total} transaction${total === 1 ? "" : "s"} matched`}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-[12px] font-semibold text-text-muted transition-colors hover:text-text"
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>

        {isLoading && !payments.length ? (
          <InlineLoading label="Loading transactions" />
        ) : error ? (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-4 text-[12px] text-warning">
            <div>{error}</div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 font-bold hover:underline"
            >
              Retry
            </button>
          </div>
        ) : payments.length === 0 && !isLoading ? (
          <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
            <p className="text-[13px] font-semibold text-text">
              {hasFilters ? "No transactions match your filters" : "No transactions yet"}
            </p>
            <p className="mt-1 text-[12px] text-text-muted">
              {hasFilters
                ? "Try a different name, email, or date range."
                : "Payment intents will appear here once users start checking out."}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-[12px] font-bold text-brand hover:underline"
              >
                Clear filters
              </button>
            ) : null}
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
                    <td className="px-5 py-4 text-text-muted">{paymentTypeLabel(p.kind)}</td>
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
              isLoading={isFetching}
              onPageChange={setPage}
            />
          </div>
        )}
      </AdminCard>
    </AdminShell>
  );
}
