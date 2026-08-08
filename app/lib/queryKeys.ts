export const queryKeys = {
  catalog: ["catalog"] as const,
  movie: (id: string) => ["movie", id] as const,
  series: (id: string) => ["series", id] as const,
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
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => ["payments", params] as const,
  transcodeJobs: (params: { page: number; pageSize: number; status?: string }) =>
    ["transcode", "jobs", params] as const,
  transcodeCounts: ["transcode", "counts"] as const,
  subscriptionPlans: ["plans", "subscription"] as const,
  promotionBanners: ["promotion-banners"] as const,
  heroFeatured: ["hero-featured"] as const,
  freeToday: ["free-today"] as const,
  genres: ["genres"] as const,
  comments: (params: { movieId: string; page: number; pageSize: number }) =>
    ["comments", params] as const,
  tvChannels: (params: { page: number; pageSize: number }) => ["tv-channels", params] as const,
  tvChannel: (id: string) => ["tv-channel", id] as const,
};
