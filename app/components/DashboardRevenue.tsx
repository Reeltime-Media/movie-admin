"use client";

import { DashboardRevenueMix } from "./DashboardRevenueMix";
import { RevenuePanel, useRevenueTimeline } from "./RevenuePanel";

export function DashboardRevenue({ compact = false }: { compact?: boolean }) {
  const { timeline, loading, error, reload } = useRevenueTimeline(30);

  return (
    <div className={compact ? "flex h-full min-h-0 flex-col" : undefined}>
      <RevenuePanel
        days={30}
        timeline={timeline}
        loading={loading}
        error={error}
        onRetry={reload}
        cardTitle="Revenue"
        cardAction={{ label: "View all", href: "/revenue" }}
        chartHeight={compact ? 168 : 280}
        fillHeight={compact}
        splitSections={compact}
        hideChartToggle={compact}
        splitAside={
          compact ? <DashboardRevenueMix timeline={timeline} loading={loading} /> : null
        }
      />
    </div>
  );
}
