"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminSubscriptionPlan,
  deleteAdminSubscriptionPlan,
  getAdminDashboardSummary,
  getAdminRevenueTimeline,
  getAdminToken,
  listAdminPayments,
  listAdminSubscriptionPlans,
  listAdminTopTitles,
  listTranscodeJobs,
  listUsers,
  retryTranscodeJob,
  updateAdminSubscriptionPlan,
  type ApiPaymentIntent,
  type ApiSubscriptionPlan,
  type ApiTopTitleReport,
  type ApiUser,
  type TranscodeJob,
} from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { RevenueDateRange } from "../components/RevenuePanel";

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: getAdminDashboardSummary,
    enabled: typeof window !== "undefined" && Boolean(getAdminToken()),
    staleTime: 60_000,
  });
}

export function useRevenueTimelineQuery(days: number, dateRange?: RevenueDateRange) {
  const dateFrom = dateRange?.from || undefined;
  const dateTo = dateRange?.to || undefined;

  return useQuery({
    queryKey: queryKeys.revenueTimeline({ days, dateFrom, dateTo }),
    queryFn: () =>
      getAdminRevenueTimeline({
        days,
        dateFrom,
        dateTo,
      }),
    enabled: typeof window !== "undefined" && Boolean(getAdminToken()),
    staleTime: 60_000,
  });
}

export function useTopTitles(params: {
  page: number;
  pageSize: number;
  contentType?: string;
}) {
  return useQuery({
    queryKey: queryKeys.topTitles(params),
    queryFn: () => listAdminTopTitles(params),
    enabled: typeof window !== "undefined" && Boolean(getAdminToken()),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useUsers(page: number, pageSize: number) {
  return useQuery({
    queryKey: queryKeys.users({ page, pageSize }),
    queryFn: () => listUsers({ page, pageSize }),
    enabled: typeof window !== "undefined" && Boolean(getAdminToken()),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function usePayments(params: {
  page: number;
  pageSize: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: queryKeys.payments(params),
    queryFn: () => listAdminPayments(params),
    enabled: typeof window !== "undefined" && Boolean(getAdminToken()),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useTranscodeJobs(params: {
  page: number;
  pageSize: number;
  status?: string;
}) {
  const queryClient = useQueryClient();

  const jobsQuery = useQuery({
    queryKey: queryKeys.transcodeJobs(params),
    queryFn: () =>
      listTranscodeJobs({
        page: params.page,
        pageSize: params.pageSize,
        status: params.status,
      }),
    enabled: typeof window !== "undefined" && Boolean(getAdminToken()),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const hasActive = items.some((j) => j.status === "running" || j.status === "queued");
      return hasActive ? 5_000 : false;
    },
  });

  const countsQuery = useQuery({
    queryKey: queryKeys.transcodeCounts,
    queryFn: async () => {
      const statuses = ["queued", "running", "success", "failed"] as const;
      const [allRes, ...statusTotals] = await Promise.all([
        listTranscodeJobs({ page: 1, pageSize: 1 }),
        ...statuses.map((status) =>
          listTranscodeJobs({ page: 1, pageSize: 1, status }).then((res) => res.total),
        ),
      ]);
      return {
        all: allRes.total,
        queued: statusTotals[0],
        running: statusTotals[1],
        success: statusTotals[2],
        failed: statusTotals[3],
      };
    },
    enabled: typeof window !== "undefined" && Boolean(getAdminToken()),
    staleTime: 10_000,
  });

  const retryMutation = useMutation({
    mutationFn: retryTranscodeJob,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transcode"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    },
  });

  return { jobsQuery, countsQuery, retryMutation };
}

export function useSubscriptionPlans() {
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: queryKeys.subscriptionPlans,
    queryFn: listAdminSubscriptionPlans,
    enabled: typeof window !== "undefined" && Boolean(getAdminToken()),
    staleTime: 5 * 60_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionPlans });
  };

  return { plansQuery, invalidate };
}

export type {
  ApiPaymentIntent,
  ApiSubscriptionPlan,
  ApiTopTitleReport,
  ApiUser,
  TranscodeJob,
};
