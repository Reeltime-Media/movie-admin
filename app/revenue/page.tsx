"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { RevenuePanel, useRevenueTimeline } from "../components/RevenuePanel";
import { useDashboardSummary } from "../hooks/adminQueries";
import { formatUsdDisplay } from "../lib/money";

const DAY_OPTIONS = [7, 30, 90] as const;

function formatTableDate(isoDate: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${isoDate}T12:00:00`));
}

export default function RevenuePage() {
  const [days, setDays] = useState<number>(30);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();

  const dateRange = useMemo(
    () => (dateFrom || dateTo ? { from: dateFrom, to: dateTo } : undefined),
    [dateFrom, dateTo],
  );
  const hasDateFilter = Boolean(dateFrom || dateTo);

  const { timeline, loading, error, reload } = useRevenueTimeline(days, dateRange);

  const dailyRows = [...(timeline?.points ?? [])].reverse().filter((row) => {
    const amount = Number.parseFloat(row.revenue_usd) || 0;
    return amount > 0 || row.payment_count > 0;
  });

  const revenueStat = hasDateFilter
    ? {
        label: "Revenue in range",
        value: loading ? "--" : `$${formatUsdDisplay(timeline?.period_revenue_usd ?? "0")}`,
        hint: timeline?.date_from && timeline?.date_to
          ? `${formatTableDate(timeline.date_from)} – ${formatTableDate(timeline.date_to)}`
          : "Custom date range",
      }
    : {
        label: "All-time revenue",
        value: summaryLoading ? "--" : `$${formatUsdDisplay(summary?.payments.revenue_usd ?? "0")}`,
        hint: "Succeeded payments",
      };

  const stats = [
    revenueStat,
    {
      label: "Succeeded",
      value: summaryLoading ? "--" : String(summary?.payments.succeeded ?? "—"),
      hint: "Completed transactions",
    },
    {
      label: "Pending",
      value: summaryLoading ? "--" : String(summary?.payments.pending ?? "—"),
      hint: "Awaiting completion",
    },
    {
      label: "Failed",
      value: summaryLoading ? "--" : String(summary?.payments.failed ?? "—"),
      hint: "Unsuccessful attempts",
    },
  ];

  const handleDaysChange = (nextDays: number) => {
    setDateFrom("");
    setDateTo("");
    setDays(nextDays);
  };

  return (
    <AdminShell title="Revenue">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface p-5">
            <div className="text-[12px] font-semibold text-text-muted">{stat.label}</div>
            <div className="mt-3 text-[28px] font-extrabold tracking-[-0.03em]">{stat.value}</div>
            <div className="mt-1 text-[12px] font-bold text-text-muted">{stat.hint}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface p-5">
        <RevenuePanel
          bare
          days={days}
          timeline={timeline}
          loading={loading}
          error={error}
          onRetry={reload}
          onDaysChange={handleDaysChange}
          dayOptions={DAY_OPTIONS}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClearDateRange={() => {
            setDateFrom("");
            setDateTo("");
          }}
          chartHeight={300}
        />
      </div>

      <div className="mt-6">
        <AdminCard title="Daily breakdown" action="All transactions" actionHref="/payments">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
            </div>
          ) : error ? (
            <p className="text-[13px] text-text-muted">{error}</p>
          ) : dailyRows.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-text-muted">
              No revenue recorded in this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[11px] font-bold uppercase tracking-wide text-text-muted">
                    <th className="px-2 py-3">Date</th>
                    <th className="px-2 py-3 text-right">Payments</th>
                    <th className="px-2 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((row) => (
                    <tr key={row.date} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-3 font-semibold text-text">
                        {formatTableDate(row.date)}
                      </td>
                      <td className="px-2 py-3 text-right text-text-muted">{row.payment_count}</td>
                      <td className="px-2 py-3 text-right font-bold text-text">
                        ${formatUsdDisplay(row.revenue_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      <p className="mt-4 text-[12px] text-text-muted">
        Revenue is calculated from succeeded payment intents.{" "}
        <Link href="/payments" className="font-semibold text-brand hover:text-brand-hover">
          Open payments
        </Link>{" "}
        to review individual transactions.
      </p>

    </AdminShell>
  );
}
