"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClientAuthReady } from "../hooks/adminQueries";
import {
  getAdminToken,
  listAdminPayments,
  type ApiRevenueKindSlice,
  type ApiRevenueTimeline,
} from "../lib/api";
import { formatUsdDisplay } from "../lib/money";

// Fixed per category so a colour always means the same thing. Status colours stay out of charts.
const SLICE_COLORS: Record<string, string> = {
  movies: "var(--rt-chart-1)",
  series: "var(--rt-chart-2)",
  subscriptions: "var(--rt-chart-3)",
};

const KIND_META: Record<string, { kind: string; label: string }> = {
  single: { kind: "movies", label: "Movies" },
  series: { kind: "series", label: "Series" },
  sub: { kind: "subscriptions", label: "Subscriptions" },
};

type MixRow = {
  kind: string;
  name: string;
  value: number;
  payment_count: number;
  color: string;
};

function emptySlices(): ApiRevenueKindSlice[] {
  return [
    { kind: "movies", label: "Movies", revenue_usd: "0", payment_count: 0 },
    { kind: "series", label: "Series", revenue_usd: "0", payment_count: 0 },
    {
      kind: "subscriptions",
      label: "Subscriptions",
      revenue_usd: "0",
      payment_count: 0,
    },
  ];
}

function slicesFromPayments(
  items: Array<{ kind: string; amount_usd: string }>,
): ApiRevenueKindSlice[] {
  const totals = new Map<string, { revenue: number; count: number }>();
  for (const meta of Object.values(KIND_META)) {
    totals.set(meta.kind, { revenue: 0, count: 0 });
  }
  for (const item of items) {
    const meta = KIND_META[item.kind];
    if (!meta) continue;
    const bucket = totals.get(meta.kind)!;
    bucket.revenue += Number.parseFloat(item.amount_usd) || 0;
    bucket.count += 1;
  }
  return emptySlices().map((slice) => {
    const bucket = totals.get(slice.kind) ?? { revenue: 0, count: 0 };
    return {
      ...slice,
      revenue_usd: bucket.revenue.toFixed(2),
      payment_count: bucket.count,
    };
  });
}

function toMixRows(slices: ApiRevenueKindSlice[]): MixRow[] {
  return slices.map((slice) => ({
    kind: slice.kind,
    name: slice.label,
    value: Number.parseFloat(slice.revenue_usd) || 0,
    payment_count: slice.payment_count,
    color: SLICE_COLORS[slice.kind] ?? "var(--rt-chart-1)",
  }));
}

function periodBounds(days: number) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { dateFrom: iso(from), dateTo: iso(to) };
}

export function DashboardRevenueMix({
  timeline,
  loading: timelineLoading,
}: {
  timeline: ApiRevenueTimeline | null;
  loading: boolean;
}) {
  const hasApiMix = Array.isArray(timeline?.by_kind);
  const days = timeline?.days ?? 30;
  const bounds = useMemo(() => periodBounds(days), [days]);
  const isAuthReady = useClientAuthReady();

  const paymentsQuery = useQuery({
    queryKey: ["revenue", "mix-fallback", bounds],
    queryFn: () =>
      listAdminPayments({
        page: 1,
        pageSize: 100,
        status: "succeeded",
        dateFrom: bounds.dateFrom,
        dateTo: bounds.dateTo,
      }),
    enabled: isAuthReady && Boolean(getAdminToken()) && !hasApiMix,
    staleTime: 60_000,
  });

  const slices = useMemo(() => {
    if (hasApiMix && timeline?.by_kind) return timeline.by_kind;
    if (!hasApiMix && paymentsQuery.data?.items) {
      return slicesFromPayments(paymentsQuery.data.items);
    }
    return emptySlices();
  }, [hasApiMix, timeline?.by_kind, paymentsQuery.data?.items]);

  const rows = useMemo(() => toMixRows(slices), [slices]);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const hasData = rows.some((row) => row.value > 0);
  const loading =
    timelineLoading ||
    (!hasApiMix &&
      (!isAuthReady || paymentsQuery.isLoading || paymentsQuery.isFetching));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-xs font-medium text-text-muted">Sales mix, last {days} days</p>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-brand" />
        </div>
      ) : !hasData ? (
        <p className="flex flex-1 items-center justify-center py-6 text-sm text-text-muted">
          No payments in this period.
        </p>
      ) : (
        <>
          <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {rows
              .filter((row) => row.value > 0)
              .map((row) => (
                <span
                  key={row.kind}
                  title={`${row.name}: $${formatUsdDisplay(row.value)}`}
                  className="min-w-1"
                  style={{ flexGrow: row.value, flexBasis: 0, background: row.color }}
                />
              ))}
          </div>

          <ul className="mt-4 space-y-3">
            {rows.map((row) => {
              const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
              return (
                <li key={row.kind} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: row.color }}
                        aria-hidden
                      />
                      <span className="truncate text-text">{row.name}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-text-muted">{pct}%</span>
                  </div>
                  <p className="mt-0.5 pl-4 font-medium tabular-nums text-text">
                    ${formatUsdDisplay(row.value)}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
