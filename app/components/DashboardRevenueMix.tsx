"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AdminCard } from "./AdminCard";
import { useClientAuthReady } from "../hooks/adminQueries";
import {
  getAdminToken,
  listAdminPayments,
  type ApiRevenueKindSlice,
  type ApiRevenueTimeline,
} from "../lib/api";
import { formatUsdDisplay } from "../lib/money";

const SLICE_COLORS: Record<string, string> = {
  movies: "var(--rt-brand)",
  series: "var(--rt-warning)",
  subscriptions: "var(--rt-success)",
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
    color: SLICE_COLORS[slice.kind] ?? "var(--rt-brand)",
  }));
}

function MixTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: MixRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
        {row.name}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-text">
        ${formatUsdDisplay(row.value)}
      </p>
      <p className="text-2xs text-text-muted">
        {row.payment_count} payment{row.payment_count === 1 ? "" : "s"}
      </p>
    </div>
  );
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
    <AdminCard title="Sales mix" fillHeight>
      <div className="flex h-full min-h-0 flex-col">
        <p className="mb-2 shrink-0 text-2xs font-medium text-text-muted">
          Movies · series · subscriptions · last {days} days
        </p>

        <div className="flex min-h-[140px] flex-1 items-center">
          {loading ? (
            <div className="flex w-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
            </div>
          ) : !hasData ? (
            <div className="flex w-full items-center justify-center text-sm text-text-muted">
              No payments in this period.
            </div>
          ) : (
            <div className="flex h-full w-full items-center gap-3">
              <div className="relative aspect-square h-[min(100%,160px)] w-auto max-h-full shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rows}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="88%"
                      paddingAngle={2}
                      stroke="var(--rt-bg)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    >
                      {rows.map((row) => (
                        <Cell key={row.kind} fill={row.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<MixTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
                    Total
                  </p>
                  <p className="text-sm font-bold tabular-nums text-text">
                    ${formatUsdDisplay(total)}
                  </p>
                </div>
              </div>

              <ul className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
                {rows.map((row) => {
                  const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
                  return (
                    <li
                      key={row.kind}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: row.color }}
                          aria-hidden
                        />
                        <span className="truncate font-semibold text-text">{row.name}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="font-bold tabular-nums text-text">
                          ${formatUsdDisplay(row.value)}
                        </span>
                        <span className="ml-1.5 text-2xs tabular-nums text-text-muted">
                          {pct}%
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AdminCard>
  );
}
