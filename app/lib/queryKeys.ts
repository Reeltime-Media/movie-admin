export const queryKeys = {
  catalog: ["catalog"] as const,
  dashboardSummary: ["dashboard", "summary"] as const,
  revenueTimeline: (params: { days: number; dateFrom?: string; dateTo?: string }) =>
    ["revenue", "timeline", params] as const,
  topTitles: (params: { page: number; pageSize: number; contentType?: string }) =>
    ["reports", "top-titles", params] as const,
  users: (params: { page: number; pageSize: number }) => ["users", params] as const,
  payments: (params: {
    page: number;
    pageSize: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => ["payments", params] as const,
  transcodeJobs: (params: { page: number; pageSize: number; status?: string }) =>
    ["transcode", "jobs", params] as const,
  transcodeCounts: ["transcode", "counts"] as const,
  subscriptionPlans: ["plans", "subscription"] as const,
  comments: (params: { movieId: string; page: number; pageSize: number }) =>
    ["comments", params] as const,
};
