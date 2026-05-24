"use client";

import { useMemo } from "react";
import { AdminCard } from "./AdminCard";
import { type ApiRevenueTimeline } from "../lib/api";
import { useRevenueTimelineQuery } from "../hooks/adminQueries";
import { formatUsdDisplay } from "../lib/money";

const CHART_WIDTH = 800;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 36;

function shortDateLabel(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRangeLabel(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const start = new Intl.DateTimeFormat(undefined, opts).format(new Date(`${from}T12:00:00`));
  const end = new Intl.DateTimeFormat(undefined, opts).format(new Date(`${to}T12:00:00`));
  return `${start} – ${end}`;
}

function periodDescription(
  timeline: ApiRevenueTimeline | null,
  days: number,
  hasCustomRange: boolean,
) {
  if (timeline?.date_from && timeline?.date_to) {
    if (hasCustomRange) {
      return formatRangeLabel(timeline.date_from, timeline.date_to);
    }
    return `${formatRangeLabel(timeline.date_from, timeline.date_to)} (${timeline.days} days)`;
  }
  return `Last ${timeline?.days ?? days} days`;
}

export type RevenueDateRange = {
  from: string;
  to: string;
};

export function useRevenueTimeline(days: number, dateRange?: RevenueDateRange) {
  const query = useRevenueTimelineQuery(days, dateRange);

  return {
    timeline: query.data ?? null,
    loading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Could not load revenue"
      : null,
    reload: () => query.refetch(),
  };
}

type RevenuePanelProps = {
  days: number;
  timeline: ApiRevenueTimeline | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onDaysChange?: (days: number) => void;
  dayOptions?: readonly number[];
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  onClearDateRange?: () => void;
  chartHeight?: number;
  cardTitle?: string;
  cardAction?: { label: string; href?: string; onClick?: () => void };
  bare?: boolean;
};

export function RevenuePanel({
  days,
  timeline,
  loading,
  error,
  onRetry,
  onDaysChange,
  dayOptions,
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
  onClearDateRange,
  chartHeight = 220,
  cardTitle = "Revenue",
  cardAction,
  bare = false,
}: RevenuePanelProps) {
  const hasCustomRange = Boolean(dateFrom || dateTo);
  const showDateFilters = Boolean(onDateFromChange && onDateToChange);
  const plotHeight = chartHeight - PAD_TOP - PAD_BOTTOM;
  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;

  const chart = useMemo(() => {
    const points = timeline?.points ?? [];
    const values = points.map((p) => Number.parseFloat(p.revenue_usd) || 0);
    const maxValue = Math.max(...values, 0);
    const yMax = maxValue > 0 ? maxValue * 1.12 : 1;

    const coords = points.map((point, index) => {
      const x =
        points.length <= 1
          ? PAD_LEFT + plotWidth / 2
          : PAD_LEFT + (index / (points.length - 1)) * plotWidth;
      const value = Number.parseFloat(point.revenue_usd) || 0;
      const y = PAD_TOP + plotHeight - (value / yMax) * plotHeight;
      return { x, y, point, value };
    });

    const linePath =
      coords.length > 0
        ? coords
            .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
            .join(" ")
        : "";

    const baseline = PAD_TOP + plotHeight;
    const areaPath =
      coords.length > 0
        ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${baseline.toFixed(1)} L ${coords[0].x.toFixed(1)} ${baseline.toFixed(1)} Z`
        : "";

    const yTicks = [0, 0.5, 1].map((fraction) => {
      const amount = yMax * fraction;
      const y = PAD_TOP + plotHeight - fraction * plotHeight;
      return { amount, y };
    });

    const xLabelIndexes =
      points.length <= 1
        ? [0]
        : points.length <= 14
          ? [0, points.length - 1]
          : [0, Math.floor((points.length - 1) / 2), points.length - 1];

    return { coords, linePath, areaPath, yTicks, xLabelIndexes };
  }, [timeline, plotHeight, plotWidth]);

  const body = loading ? (
    <div className="flex h-52 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand" />
    </div>
  ) : error ? (
    <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
      <p className="text-[13px] font-semibold text-text">Could not load revenue</p>
      <p className="mt-1 text-[12px] text-text-muted">{error}</p>
      <button
        type="button"
        onClick={() => void onRetry()}
        className="mt-4 text-[12px] font-semibold text-brand hover:text-brand-hover"
      >
        Retry
      </button>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        {dayOptions && dayOptions.length > 0 && onDaysChange ? (
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((option) => {
              const active = !hasCustomRange && option === days;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onDaysChange(option)}
                  className={[
                    "rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                    active
                      ? "border-brand bg-brand/15 text-text"
                      : "border-border bg-bg text-text-muted hover:border-border-hover hover:text-text",
                  ].join(" ")}
                >
                  Last {option} days
                </button>
              );
            })}
          </div>
        ) : null}

        {showDateFilters ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-text-disabled">
                From date
              </span>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => onDateFromChange?.(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none transition-colors focus:border-border-hover focus:bg-surface-elevated"
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
                onChange={(e) => onDateToChange?.(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none transition-colors focus:border-border-hover focus:bg-surface-elevated"
              />
            </label>
          </div>
        ) : null}

        {hasCustomRange && onClearDateRange ? (
          <button
            type="button"
            onClick={onClearDateRange}
            className="self-start text-[12px] font-semibold text-text-muted transition-colors hover:text-text"
          >
            Clear date range
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            Total revenue
          </p>
          <p
            className={[
              "mt-1 font-extrabold tracking-[-0.03em] text-text",
              bare ? "text-[42px]" : "text-[36px]",
            ].join(" ")}
          >
            ${formatUsdDisplay(timeline?.period_revenue_usd ?? "0")}
          </p>
          <p className="mt-1 text-[12px] text-text-muted">
            {periodDescription(timeline, days, hasCustomRange)}
            {timeline && timeline.succeeded_payments > 0
              ? ` · ${timeline.succeeded_payments} payment${timeline.succeeded_payments === 1 ? "" : "s"}`
              : ""}
            {!hasCustomRange
              ? ` · All-time $${formatUsdDisplay(timeline?.all_time_revenue_usd ?? "0")}`
              : ""}
          </p>
        </div>
      </div>

      <div className="rounded-md border border-border bg-bg p-3 sm:p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Daily revenue ({periodDescription(timeline, days, hasCustomRange)})
        </p>
        {(timeline?.points.length ?? 0) === 0 ? (
          <p className="py-12 text-center text-[13px] text-text-muted">No payments yet.</p>
        ) : (
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}
            className="h-auto w-full"
            role="img"
            aria-label={`Revenue trend for ${periodDescription(timeline, days, hasCustomRange)}`}
          >
            {chart.yTicks.map((tick) => (
              <g key={tick.amount}>
                <line
                  x1={PAD_LEFT}
                  y1={tick.y}
                  x2={CHART_WIDTH - PAD_RIGHT}
                  y2={tick.y}
                  stroke="var(--rt-border)"
                  strokeWidth={1}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="fill-text-muted text-[10px]"
                >
                  ${formatUsdDisplay(tick.amount)}
                </text>
              </g>
            ))}

            {chart.areaPath ? (
              <path
                d={chart.areaPath}
                fill="color-mix(in srgb, var(--rt-brand) 22%, transparent)"
              />
            ) : null}
            {chart.linePath ? (
              <path
                d={chart.linePath}
                fill="none"
                stroke="var(--rt-brand)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {chart.coords.map(({ x, y, point }) => (
              <circle key={point.date} cx={x} cy={y} r={3} fill="var(--rt-brand)">
                <title>
                  {shortDateLabel(point.date)}: ${formatUsdDisplay(point.revenue_usd)}
                  {point.payment_count > 0
                    ? ` (${point.payment_count} payment${point.payment_count === 1 ? "" : "s"})`
                    : ""}
                </title>
              </circle>
            ))}

            {chart.xLabelIndexes.map((index) => {
              const item = timeline?.points[index];
              const coord = chart.coords[index];
              if (!item || !coord) return null;
              return (
                <text
                  key={item.date}
                  x={coord.x}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className="fill-text-muted text-[10px]"
                >
                  {shortDateLabel(item.date)}
                </text>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );

  if (bare) {
    return body;
  }

  return (
    <AdminCard
      title={cardTitle}
      action={cardAction?.label}
      actionHref={cardAction?.href}
      actionOnClick={cardAction?.onClick}
    >
      {body}
    </AdminCard>
  );
}
