"use client";

import { useEffect, useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminErrorAlert } from "../components/AdminErrorAlert";
import { InlineLoading } from "../components/InlineLoading";
import { AdminShell } from "../components/AdminShell";
import { AdminPagination } from "../components/AdminPagination";
import { AdminTable, AdminTableHead, AdminTableWrap, AdminTh } from "../components/AdminTable";
import { usePayments } from "../hooks/adminQueries";
import { type ApiPaymentIntent } from "../lib/api";
import {
  adminBadgeClass,
  adminFilterBarClass,
  adminInputClass,
  adminLabelClass,
  adminTdClass,
} from "../lib/adminUi";

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function paymentStatusTone(status: string): "success" | "warning" | "brand" | "muted" {
  if (status === "succeeded") return "success";
  if (status === "pending") return "warning";
  if (status === "failed") return "brand";
  return "muted";
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
        <span className="mt-0.5 block text-[12px] text-text-muted">{payment.user_email}</span>
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
        flush
      >
        <div className={adminFilterBarClass}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block sm:col-span-2 lg:col-span-2">
              <span className={adminLabelClass}>Search user</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or email"
                className={adminInputClass}
                autoComplete="off"
              />
            </label>
            <label className="block">
              <span className={adminLabelClass}>From date</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={adminInputClass}
              />
            </label>
            <label className="block">
              <span className={adminLabelClass}>To date</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className={adminInputClass}
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
          <AdminErrorAlert message={error} onRetry={() => void refetch()} />
        ) : payments.length === 0 && !isLoading ? (
          <AdminEmptyState
            title={hasFilters ? "No transactions match your filters" : "No transactions yet"}
            description={
              hasFilters
                ? "Try a different name, email, or date range."
                : "Payment intents will appear here once users start checking out."
            }
            action={
              hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[12px] font-bold text-brand hover:underline"
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <AdminTableWrap>
              <div className="-mx-5">
                <AdminTable minWidth="900px">
                  <AdminTableHead>
                    <AdminTh>User</AdminTh>
                    <AdminTh>Order</AdminTh>
                    <AdminTh>Type</AdminTh>
                    <AdminTh>Amount</AdminTh>
                    <AdminTh>Status</AdminTh>
                    <AdminTh>Date</AdminTh>
                  </AdminTableHead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.intent_id}>
                        <td className={adminTdClass}>{userLabel(p)}</td>
                        <td className={`${adminTdClass} font-semibold text-text`}>{p.order_id}</td>
                        <td className={`${adminTdClass} text-text-muted`}>
                          {paymentTypeLabel(p.kind)}
                        </td>
                        <td className={`${adminTdClass} text-text-muted`}>${p.amount_usd}</td>
                        <td className={adminTdClass}>
                          <span className={adminBadgeClass(paymentStatusTone(p.status))}>
                            {p.status}
                          </span>
                        </td>
                        <td className={`${adminTdClass} text-text-muted`}>
                          {formatDate(p.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTable>
              </div>
            </AdminTableWrap>
            <AdminPagination
              page={page}
              pages={pages}
              total={total}
              pageSize={PAGE_SIZE}
              isLoading={isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </AdminCard>
    </AdminShell>
  );
}
