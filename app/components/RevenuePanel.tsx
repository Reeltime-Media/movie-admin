"use client";

import { useMemo, useState } from "react";
import { AdminCard } from "./AdminCard";
import { AdminErrorAlert } from "./AdminErrorAlert";
import { InlineLoading } from "./InlineLoading";
import { type ApiRevenueTimeline, type ApiRevenueTimelinePoint } from "../lib/api";
import { useRevenueTimelineQuery } from "../hooks/adminQueries";
import { adminInputClass, adminLabelClass, adminTabClass } from "../lib/adminUi";
import { formatUsdDisplay } from "../lib/money";

const CHART_WIDTH = 800;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 36;

type ChartStyle = "line" | "candle";

type CandlePoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  payment_count: number;
  up: boolean;
};

/** Day-over-day candles from daily totals (no intraday OHLC from the API). */
function toCandles(points: ApiRevenueTimelinePoint[]): CandlePoint[] {
  return points.map((point, index) => {
    const close = Number.parseFloat(point.revenue_usd) || 0;
    const open =
      index === 0
        ? close
        : Number.parseFloat(points[index - 1]?.revenue_usd ?? "0") || 0;
    const high = Math.max(open, close);
    const low = Math.min(open, close);
    return {
      date: point.date,
      open,
      high,
      low,
      close,
      payment_count: point.payment_count,
      up: close >= open,
    };
  });
}

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
    return `${formatRangeLabel(timeline.date_from, timeline.date_to)} (${timeline.days ?? days} days)`;
  }
  return `Last ${timeline?.days ?? days} days`;
}

export type RevenueDateRange = {
  from: string;
  to: string;
};

export function useRevenueTimeline(days: number, dateRange?: RevenueDateRange) {
  const query = useRevenueTimelineQuery(days, dateRange);
  const loading =
    !query.isAuthReady || query.isLoading || query.isFetching;

  return {
    timeline: query.data ?? null,
    loading,
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
  const [chartStyle, setChartStyle] = useState<ChartStyle>("line");
  const hasCustomRange = Boolean(dateFrom || dateTo);
  const showDateFilters = Boolean(onDateFromChange && onDateToChange);
  const plotHeight = chartHeight - PAD_TOP - PAD_BOTTOM;
  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;

  const chart = useMemo(() => {
    const points = timeline?.points ?? [];
    const candles = toCandles(points);
    const lineValues = points.map((p) => Number.parseFloat(p.revenue_usd) || 0);
    const candleValues = candles.flatMap((c) => [c.high, c.low]);
    const maxValue = Math.max(
      ...(chartStyle === "candle" ? candleValues : lineValues),
      0,
    );
    const yMax = maxValue > 0 ? maxValue * 1.12 : 1;

    const yFor = (value: number) =>
      PAD_TOP + plotHeight - (value / yMax) * plotHeight;

    const coords = points.map((point, index) => {
      const x =
        points.length <= 1
          ? PAD_LEFT + plotWidth / 2
          : PAD_LEFT + (index / (points.length - 1)) * plotWidth;
      const value = Number.parseFloat(point.revenue_usd) || 0;
      return { x, y: yFor(value), point, value };
    });

    const candleSlots = candles.map((candle, index) => {
      const x =
        candles.length <= 1
          ? PAD_LEFT + plotWidth / 2
          : PAD_LEFT + (index / (candles.length - 1)) * plotWidth;
      const gap =
        candles.length <= 1
          ? plotWidth * 0.35
          : plotWidth / (candles.length - 1);
      const bodyWidth = Math.max(4, Math.min(18, gap * 0.55));
      const openY = yFor(candle.open);
      const closeY = yFor(candle.close);
      const highY = yFor(candle.high);
      const lowY = yFor(candle.low);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));
      return {
        candle,
        x,
        bodyWidth,
        bodyTop,
        bodyHeight,
        highY,
        lowY,
      };
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

    return {
      coords,
      candleSlots,
      linePath,
      areaPath,
      yTicks,
      xLabelIndexes,
    };
  }, [timeline, plotHeight, plotWidth, chartStyle]);

  const body = loading ? (
    <InlineLoading label="Loading revenue" minHeight="md" />
  ) : error ? (
    <AdminErrorAlert message={error} onRetry={() => void onRetry()} />
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
                  className={adminTabClass(active)}
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
              <span className={adminLabelClass}>From date</span>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => onDateFromChange?.(e.target.value)}
                className={adminInputClass}
              />
            </label>
            <label className="block">
              <span className={adminLabelClass}>To date</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => onDateToChange?.(e.target.value)}
                className={adminInputClass}
              />
            </label>
          </div>
        ) : null}

        {hasCustomRange && onClearDateRange ? (
          <button
            type="button"
            onClick={onClearDateRange}
            className="self-start text-xs font-semibold text-text-muted transition-colors hover:text-text"
          >
            Clear date range
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
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
          <p className="mt-1 text-xs text-text-muted">
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

      <div className="rounded-lg border border-border bg-bg p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
            Daily revenue ({periodDescription(timeline, days, hasCustomRange)})
          </p>
          <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5">
            {(
              [
                { id: "line", label: "Line" },
                { id: "candle", label: "Candlestick" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setChartStyle(option.id)}
                className={[
                  "rounded-md px-2.5 py-1 text-2xs font-semibold transition-colors",
                  chartStyle === option.id
                    ? "bg-brand text-white"
                    : "text-text-muted hover:text-text",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {(timeline?.points.length ?? 0) === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted">No payments yet.</p>
        ) : (
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}
            className="h-auto w-full"
            role="img"
            aria-label={`Revenue ${chartStyle === "candle" ? "candlestick" : "trend"} for ${periodDescription(timeline, days, hasCustomRange)}`}
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
                  className="fill-text-muted text-2xs"
                >
                  ${formatUsdDisplay(tick.amount)}
                </text>
              </g>
            ))}

            {chartStyle === "line" ? (
              <>
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
              </>
            ) : (
              chart.candleSlots.map(
                ({ candle, x, bodyWidth, bodyTop, bodyHeight, highY, lowY }) => {
                  const color = candle.up
                    ? "var(--rt-success, #16a34a)"
                    : "var(--rt-danger, #dc2626)";
                  return (
                    <g key={candle.date}>
                      <line
                        x1={x}
                        y1={highY}
                        x2={x}
                        y2={lowY}
                        stroke={color}
                        strokeWidth={1.5}
                      />
                      <rect
                        x={x - bodyWidth / 2}
                        y={bodyTop}
                        width={bodyWidth}
                        height={bodyHeight}
                        fill={color}
                        rx={1}
                      >
                        <title>
                          {shortDateLabel(candle.date)}
                          {` · O $${formatUsdDisplay(candle.open)}`}
                          {` · H $${formatUsdDisplay(candle.high)}`}
                          {` · L $${formatUsdDisplay(candle.low)}`}
                          {` · C $${formatUsdDisplay(candle.close)}`}
                          {candle.payment_count > 0
                            ? ` (${candle.payment_count} payment${candle.payment_count === 1 ? "" : "s"})`
                            : ""}
                        </title>
                      </rect>
                    </g>
                  );
                },
              )
            )}

            {chart.xLabelIndexes.map((index) => {
              const item = timeline?.points[index];
              const coord =
                chartStyle === "candle"
                  ? chart.candleSlots[index]
                  : chart.coords[index];
              if (!item || !coord) return null;
              return (
                <text
                  key={item.date}
                  x={coord.x}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  className="fill-text-muted text-2xs"
                >
                  {shortDateLabel(item.date)}
                </text>
              );
            })}
          </svg>
        )}
        {chartStyle === "candle" && (timeline?.points.length ?? 0) > 0 ? (
          <p className="mt-2 text-2xs text-text-muted">
            Candles compare each day to the previous day (open → close). Green =
            up, red = down.
          </p>
        ) : null}
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
