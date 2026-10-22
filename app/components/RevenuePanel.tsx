"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminCard } from "./AdminCard";
import { AdminErrorAlert } from "./AdminErrorAlert";
import { InlineLoading } from "./InlineLoading";
import { type ApiRevenueTimeline, type ApiRevenueTimelinePoint } from "../lib/api";
import { useRevenueTimelineQuery } from "../hooks/adminQueries";
import { adminInputClass, adminLabelClass, adminTabClass } from "../lib/adminUi";
import { formatUsdDisplay } from "../lib/money";

type ChartStyle = "line" | "candle";

type ChartRow = {
  date: string;
  label: string;
  revenue: number;
  payment_count: number;
  open: number;
  high: number;
  low: number;
  close: number;
  up: boolean;
};

/** Day-over-day candles from daily totals (no intraday OHLC from the API). */
function toChartRows(points: ApiRevenueTimelinePoint[]): ChartRow[] {
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
      label: shortDateLabel(point.date),
      revenue: close,
      payment_count: point.payment_count,
      open,
      high,
      low,
      close,
      up: close >= open,
    };
  });
}

function shortDateLabel(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRangeLabel(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const start = new Intl.DateTimeFormat(undefined, opts).format(
    new Date(`${from}T12:00:00`),
  );
  const end = new Intl.DateTimeFormat(undefined, opts).format(
    new Date(`${to}T12:00:00`),
  );
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
  const loading = !query.isAuthReady || query.isLoading || query.isFetching;

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
  fillHeight?: boolean;
  /** Render total + chart as two separate cards (dashboard layout). */
  splitSections?: boolean;
  /** Optional card placed beside the daily chart when `splitSections` is on. */
  splitAside?: ReactNode;
  /** Hide line/candle toggle (dashboard pair uses line only). */
  hideChartToggle?: boolean;
};

/** Maps OHLC onto the pixel band for a `high` bar with Y domain starting at 0. */
function CandleShape(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: ChartRow;
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload) return null;
  const { open, close, high, low, up } = payload;
  const ceiling = Math.max(high, 0.0001);
  const toY = (value: number) => y + height * (1 - value / ceiling);
  const xMid = x + width / 2;
  const bodyWidth = Math.max(4, Math.min(14, width * 0.55));
  const yOpen = toY(open);
  const yClose = toY(close);
  const yHigh = toY(high);
  const yLow = toY(low);
  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
  const color = up ? "var(--rt-success, #16a34a)" : "var(--rt-danger, #dc2626)";

  return (
    <g>
      <line
        x1={xMid}
        y1={yHigh}
        x2={xMid}
        y2={yLow}
        stroke={color}
        strokeWidth={1.5}
      />
      <rect
        x={xMid - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={color}
        rx={1.5}
      />
    </g>
  );
}

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="text-2xs font-semibold uppercase tracking-wide text-text-muted">
        {row.label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-text">
        ${formatUsdDisplay(row.revenue)}
      </p>
      {row.payment_count > 0 ? (
        <p className="text-2xs text-text-muted">
          {row.payment_count} payment{row.payment_count === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

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
  fillHeight = false,
  splitSections = false,
  splitAside,
  hideChartToggle = false,
}: RevenuePanelProps) {
  const [chartStyle, setChartStyle] = useState<ChartStyle>("line");
  const activeChartStyle: ChartStyle = hideChartToggle ? "line" : chartStyle;
  const gradientId = useId().replace(/:/g, "");
  const areaGradientId = `rt-rev-area-${gradientId}`;
  const hasCustomRange = Boolean(dateFrom || dateTo);
  const showDateFilters = Boolean(onDateFromChange && onDateToChange);

  const chartToggle = (
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
  );

  const summaryBlock = (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-text-muted">
        Total revenue
      </p>
      <p
        className={[
          "mt-1 font-extrabold tracking-[-0.03em] text-text",
          bare ? "text-[42px]" : fillHeight || splitSections ? "text-[28px] leading-none" : "text-[36px]",
        ].join(" ")}
      >
        ${formatUsdDisplay(timeline?.period_revenue_usd ?? "0")}
      </p>
      <p className="mt-2 text-2xs font-medium text-text-muted">
        {periodDescription(timeline, days, hasCustomRange)}
        {timeline && timeline.succeeded_payments > 0
          ? ` · ${timeline.succeeded_payments} payment${timeline.succeeded_payments === 1 ? "" : "s"}`
          : ""}
        {!hasCustomRange
          ? ` · All-time $${formatUsdDisplay(timeline?.all_time_revenue_usd ?? "0")}`
          : ""}
      </p>
    </div>
  );

  const data = useMemo(
    () => toChartRows(timeline?.points ?? []),
    [timeline?.points],
  );

  const xTicks = useMemo(() => {
    if (data.length <= 1) return data.map((d) => d.date);
    if (data.length <= 14) return [data[0].date, data[data.length - 1].date];
    const mid = Math.floor((data.length - 1) / 2);
    return [data[0].date, data[mid].date, data[data.length - 1].date];
  }, [data]);

  const axisStroke = "var(--rt-border)";
  const tickFill = "var(--rt-text-muted)";
  const brand = "var(--rt-brand)";

  const chartBody =
    data.length === 0 ? (
      <p
        className={[
          "text-center text-sm text-text-muted",
          fillHeight ? "flex flex-1 items-center justify-center" : "py-12",
        ].join(" ")}
      >
        No payments yet.
      </p>
    ) : (
      <div
        className={fillHeight ? "min-h-0 flex-1" : undefined}
        style={fillHeight ? undefined : { height: chartHeight }}
      >
        <ResponsiveContainer width="100%" height="100%" minHeight={fillHeight ? 120 : chartHeight}>
          {activeChartStyle === "line" ? (
            <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={brand} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={brand} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={axisStroke}
                strokeDasharray="3 6"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                ticks={xTicks}
                tickFormatter={shortDateLabel}
                tick={{ fill: tickFill, fontSize: 11, fontWeight: 600 }}
                axisLine={{ stroke: axisStroke }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => `$${formatUsdDisplay(v)}`}
                tick={{ fill: tickFill, fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                content={<RevenueTooltip />}
                cursor={{
                  stroke: brand,
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={brand}
                strokeWidth={2.5}
                fill={`url(#${areaGradientId})`}
                activeDot={{
                  r: 5,
                  stroke: "var(--rt-bg)",
                  strokeWidth: 2,
                  fill: brand,
                }}
                dot={false}
                isAnimationActive={!fillHeight}
              />
            </AreaChart>
          ) : (
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                stroke={axisStroke}
                strokeDasharray="3 6"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                ticks={xTicks}
                tickFormatter={shortDateLabel}
                tick={{ fill: tickFill, fontSize: 11, fontWeight: 600 }}
                axisLine={{ stroke: axisStroke }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => `$${formatUsdDisplay(v)}`}
                tick={{ fill: tickFill, fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={52}
                domain={[0, "auto"]}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ fill: "transparent" }} />
              <Bar
                dataKey="high"
                // recharts shape props are loosely typed across versions
                shape={(props) => <CandleShape {...(props as object)} />}
                isAnimationActive={!fillHeight}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    );

  const body = loading ? (
    <InlineLoading label="Loading revenue" minHeight="md" />
  ) : error ? (
    <AdminErrorAlert message={error} onRetry={() => void onRetry()} />
  ) : (
    <div
      className={
        fillHeight ? "flex h-full min-h-0 flex-col gap-3" : "space-y-6"
      }
    >
      <div className="flex shrink-0 flex-col gap-3">
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

      <div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
        {summaryBlock}
      </div>

      <div
        className={[
          "rounded-xl border border-border bg-bg p-3 sm:p-4",
          fillHeight ? "flex min-h-0 flex-1 flex-col" : "",
        ].join(" ")}
      >
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            Daily revenue ({periodDescription(timeline, days, hasCustomRange)})
          </p>
          {chartToggle}
        </div>
        {chartBody}
      </div>
    </div>
  );

  if (bare) {
    return body;
  }

  if (splitSections) {
    if (loading) {
      return (
        <div className={fillHeight ? "flex h-full min-h-0 flex-col gap-3" : "space-y-3"}>
          <AdminCard title={cardTitle}>
            <InlineLoading label="Loading revenue" minHeight="sm" />
          </AdminCard>
        </div>
      );
    }
    if (error) {
      return (
        <div className={fillHeight ? "flex h-full min-h-0 flex-col gap-3" : "space-y-3"}>
          <AdminCard title={cardTitle}>
            <AdminErrorAlert message={error} onRetry={() => void onRetry()} />
          </AdminCard>
        </div>
      );
    }
    const periodLabel = periodDescription(timeline, days, hasCustomRange);
    const pairedChart = (
      <div className="min-h-[140px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={140}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={brand} stopOpacity={0.35} />
                <stop offset="100%" stopColor={brand} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={axisStroke} strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="date"
              ticks={xTicks}
              tickFormatter={shortDateLabel}
              tick={{ fill: tickFill, fontSize: 10, fontWeight: 600 }}
              axisLine={{ stroke: axisStroke }}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              tickFormatter={(v: number) => `$${formatUsdDisplay(v)}`}
              tick={{ fill: tickFill, fontSize: 10, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              content={<RevenueTooltip />}
              cursor={{ stroke: brand, strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={brand}
              strokeWidth={2.25}
              fill={`url(#${areaGradientId})`}
              activeDot={{
                r: 4,
                stroke: "var(--rt-bg)",
                strokeWidth: 2,
                fill: brand,
              }}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );

    const dailyCard = (
      <AdminCard
        title="Daily revenue"
        headerAction={hideChartToggle ? undefined : chartToggle}
        fillHeight
      >
        <div className="flex h-full min-h-0 flex-col">
          <p className="mb-2 shrink-0 text-2xs font-medium text-text-muted">{periodLabel}</p>
          {data.length === 0 ? (
            <div className="flex min-h-[140px] flex-1 items-center justify-center text-sm text-text-muted">
              No payments yet.
            </div>
          ) : (
            pairedChart
          )}
        </div>
      </AdminCard>
    );

    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <AdminCard
          title={cardTitle}
          action={cardAction?.label}
          actionHref={cardAction?.href}
          actionOnClick={cardAction?.onClick}
        >
          {summaryBlock}
        </AdminCard>
        {splitAside ? (
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2 lg:items-stretch">
            <div className="min-h-0 h-full">{dailyCard}</div>
            <div className="min-h-0 h-full">{splitAside}</div>
          </div>
        ) : (
          <div className="min-h-0 flex-1">{dailyCard}</div>
        )}
      </div>
    );
  }

  return (
    <AdminCard
      title={cardTitle}
      action={cardAction?.label}
      actionHref={cardAction?.href}
      actionOnClick={cardAction?.onClick}
      fillHeight={fillHeight}
    >
      {body}
    </AdminCard>
  );
}
