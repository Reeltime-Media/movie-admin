"use client";

import { useEffect, useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminErrorAlert } from "../components/AdminErrorAlert";
import { AdminSelect } from "../components/AdminSelect";
import { InlineLoading } from "../components/InlineLoading";
import { AdminShell } from "../components/AdminShell";
import { AdminPagination } from "../components/AdminPagination";
import { AdminTable, AdminTableHead, AdminTableWrap, AdminTh } from "../components/AdminTable";
import { usePayments } from "../hooks/adminQueries";
import { fulfillAdminPayment, type ApiPaymentIntent } from "../lib/api";
import {
  adminBadgeClass,
  adminFilterBarClass,
  adminInputClass,
  adminLabelClass,
  adminTdClass,
} from "../lib/adminUi";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

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
  if (kind === "series") return "series-unlock";
  return "single-movie";
}

function userLabel(payment: ApiPaymentIntent) {
  if (payment.user_full_name) {
    return (
      <>
        <span className="font-semibold text-text">{payment.user_full_name}</span>
        <span className="mt-0.5 block text-xs text-text-muted">{payment.user_email}</span>
      </>
    );
  }
  return <span className="text-text">{payment.user_email}</span>;
}

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const hasFilters = Boolean(debouncedSearch || status !== "all" || dateFrom || dateTo);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  const [prevStatus, setPrevStatus] = useState(status);
  const [prevDateFrom, setPrevDateFrom] = useState(dateFrom);
  const [prevDateTo, setPrevDateTo] = useState(dateTo);

  let currentPage = page;
  if (
    debouncedSearch !== prevSearch ||
    status !== prevStatus ||
    dateFrom !== prevDateFrom ||
    dateTo !== prevDateTo
  ) {
    setPrevSearch(debouncedSearch);
    setPrevStatus(status);
    setPrevDateFrom(dateFrom);
    setPrevDateTo(dateTo);
    currentPage = 1;
    setPage(1);
  }

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = usePayments({
    page: currentPage,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
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
    setStatus("all");
    setDateFrom("");
    setDateTo("");
  };

  const markPaid = async (payment: ApiPaymentIntent) => {
    if (payment.status !== "pending") return;
    const ok = window.confirm(
      `Mark ${payment.order_id} ($${payment.amount_usd}) as paid?\nOnly do this after you verify the Bakong/bank receipt.`,
    );
    if (!ok) return;
    setActionError(null);
    setFulfillingId(payment.intent_id);
    try {
      await fulfillAdminPayment(payment.intent_id);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not mark payment as paid.");
    } finally {
      setFulfillingId(null);
    }
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              <span className={adminLabelClass}>Status</span>
              <AdminSelect
                value={status}
                onChange={(v) => setStatus(v as StatusFilter)}
                options={[...STATUS_OPTIONS]}
                aria-label="Filter by status"
                className={`${adminInputClass} py-2`}
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
              <p className="text-xs text-text-muted">
                {isFetching ? "Filtering…" : `${total} transaction${total === 1 ? "" : "s"} matched`}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-text-muted transition-colors hover:text-text"
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>

        {actionError ? <AdminErrorAlert message={actionError} /> : null}

        {isLoading && !payments.length ? (
          <InlineLoading label="Loading transactions" />
        ) : error ? (
          <AdminErrorAlert message={error} onRetry={() => void refetch()} />
        ) : payments.length === 0 && !isLoading ? (
          <AdminEmptyState
            title={hasFilters ? "No transactions match your filters" : "No transactions yet"}
            description={
              hasFilters
                ? "Try a different name, email, status, or date range."
                : "Payment intents will appear here once users start checking out."
            }
            action={
              hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-brand hover:underline"
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
                <AdminTable minWidth="980px">
                  <AdminTableHead>
                    <AdminTh>User</AdminTh>
                    <AdminTh>Order</AdminTh>
                    <AdminTh>Type</AdminTh>
                    <AdminTh className="text-right">Amount</AdminTh>
                    <AdminTh>Status</AdminTh>
                    <AdminTh>Date</AdminTh>
                    <AdminTh className="text-right">Actions</AdminTh>
                  </AdminTableHead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.intent_id}>
                        <td className={adminTdClass}>{userLabel(p)}</td>
                        <td className={`${adminTdClass} font-semibold text-text`}>{p.order_id}</td>
                        <td className={`${adminTdClass} text-text-muted`}>
                          {paymentTypeLabel(p.kind)}
                          {p.method ? (
                            <span className="mt-0.5 block text-xs text-text-muted">{p.method}</span>
                          ) : null}
                        </td>
                        <td className={`${adminTdClass} text-right tabular-nums text-text-muted`}>
                          ${p.amount_usd}
                        </td>
                        <td className={adminTdClass}>
                          <span className={adminBadgeClass(paymentStatusTone(p.status))}>
                            {p.status}
                          </span>
                        </td>
                        <td className={`${adminTdClass} text-text-muted`}>
                          {formatDate(p.created_at)}
                        </td>
                        <td className={`${adminTdClass} text-right`}>
                          {p.status === "pending" ? (
                            <button
                              type="button"
                              disabled={fulfillingId === p.intent_id}
                              onClick={() => void markPaid(p)}
                              className="rounded-md bg-brand px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
                            >
                              {fulfillingId === p.intent_id ? "Saving…" : "Mark paid"}
                            </button>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTable>
              </div>
            </AdminTableWrap>
            <AdminPagination
              page={currentPage}
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
