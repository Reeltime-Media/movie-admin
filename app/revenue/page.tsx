"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { AdminStatCard, AdminStatGrid } from "../components/AdminStatCard";
import { AdminTable, AdminTableHead, AdminTableWrap, AdminTh } from "../components/AdminTable";
import { RevenuePanel, useRevenueTimeline } from "../components/RevenuePanel";
import { useDashboardSummary } from "../hooks/adminQueries";
import { adminTdClass } from "../lib/adminUi";
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
        hint:
          timeline?.date_from && timeline?.date_to
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
      <AdminStatGrid>
        {stats.map((stat) => (
          <AdminStatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
        ))}
      </AdminStatGrid>

      <AdminCard title="Revenue timeline" flush>
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
          chartHeight={200}
        />
      </AdminCard>

      <AdminCard title="Daily breakdown" action="All transactions" actionHref="/payments" flush>
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
          <AdminTableWrap>
            <div className="-mx-5">
              <AdminTable minWidth="480px">
                <AdminTableHead>
                  <AdminTh>Date</AdminTh>
                  <AdminTh className="text-right">Payments</AdminTh>
                  <AdminTh className="text-right">Revenue</AdminTh>
                </AdminTableHead>
                <tbody className="divide-y divide-border">
                  {dailyRows.map((row) => (
                    <tr key={row.date}>
                      <td className={`${adminTdClass} font-semibold text-text`}>
                        {formatTableDate(row.date)}
                      </td>
                      <td className={`${adminTdClass} text-right text-text-muted`}>
                        {row.payment_count}
                      </td>
                      <td className={`${adminTdClass} text-right font-semibold text-text`}>
                        ${formatUsdDisplay(row.revenue_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            </div>
          </AdminTableWrap>
        )}
      </AdminCard>

      <p className="text-[12px] text-text-muted">
        Revenue is calculated from succeeded payment intents.{" "}
        <Link href="/payments" className="font-semibold text-brand hover:text-brand-hover">
          Open payments
        </Link>{" "}
        to review individual transactions.
      </p>
    </AdminShell>
  );
}
