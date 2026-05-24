"use client";

import { RevenuePanel, useRevenueTimeline } from "./RevenuePanel";

export function DashboardRevenue() {
  const { timeline, loading, error, reload } = useRevenueTimeline(30);

  return (
    <RevenuePanel
      days={30}
      timeline={timeline}
      loading={loading}
      error={error}
      onRetry={reload}
      cardTitle="Revenue"
      cardAction={{ label: "View all", href: "/revenue" }}
    />
  );
}
