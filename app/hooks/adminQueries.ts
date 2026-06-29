"use client";

import { useSyncExternalStore } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createGenre,
  deleteGenre,
  getAdminDashboardSummary,
  getAdminRevenueTimeline,
  getAdminToken,
  listAdminPayments,
  listAdminSubscriptionPlans,
  listAdminTopTitles,
  listGenres,
  listTranscodeJobs,
  listUsers,
  retryTranscodeJob,
  type ApiGenre,
  type ApiPaymentIntent,
  type ApiSubscriptionPlan,
  type ApiTopTitleReport,
  type ApiUser,
  type TranscodeJob,
} from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { RevenueDateRange } from "../components/RevenuePanel";

const emptySubscribe = () => () => {};

/** Avoid SSR/client mismatch: queries only run after mount (when auth token is readable). */
export function useClientAuthReady() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/** True while waiting for client mount or an in-flight fetch — safe for SSR + hydration. */
export function useQueryLoadingBeforeAuth(
  isAuthReady: boolean,
  query: { isLoading: boolean; isFetching: boolean },
) {
  return !isAuthReady || query.isLoading || query.isFetching;
}

export function useDashboardSummary() {
  const isAuthReady = useClientAuthReady();

  return useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: getAdminDashboardSummary,
    enabled: isAuthReady && Boolean(getAdminToken()),
    staleTime: 60_000,
  });
}

export function useRevenueTimelineQuery(days: number, dateRange?: RevenueDateRange) {
  const isAuthReady = useClientAuthReady();
  const dateFrom = dateRange?.from || undefined;
  const dateTo = dateRange?.to || undefined;

  const query = useQuery({
    queryKey: queryKeys.revenueTimeline({ days, dateFrom, dateTo }),
    queryFn: () =>
      getAdminRevenueTimeline({
        days,
        dateFrom,
        dateTo,
      }),
    enabled: isAuthReady && Boolean(getAdminToken()),
    staleTime: 60_000,
  });

  return { ...query, isAuthReady };
}

export function useTopTitles(params: {
  page: number;
  pageSize: number;
  contentType?: string;
}) {
  const isAuthReady = useClientAuthReady();

  const query = useQuery({
    queryKey: queryKeys.topTitles(params),
    queryFn: () => listAdminTopTitles(params),
    enabled: isAuthReady && Boolean(getAdminToken()),
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
  });

  return { ...query, isAuthReady };
}

export function useUsers(page: number, pageSize: number) {
  const isAuthReady = useClientAuthReady();

  const query = useQuery({
    queryKey: queryKeys.users({ page, pageSize }),
    queryFn: () => listUsers({ page, pageSize }),
    enabled: isAuthReady && Boolean(getAdminToken()),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  return { ...query, isAuthReady };
}

export function usePayments(params: {
  page: number;
  pageSize: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const isAuthReady = useClientAuthReady();

  const query = useQuery({
    queryKey: queryKeys.payments(params),
    queryFn: () => listAdminPayments(params),
    enabled: isAuthReady && Boolean(getAdminToken()),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  return { ...query, isAuthReady };
}

export function useTranscodeJobs(params: {
  page: number;
  pageSize: number;
  status?: string;
}) {
  const queryClient = useQueryClient();
  const isAuthReady = useClientAuthReady();

  const jobsQuery = useQuery({
    queryKey: queryKeys.transcodeJobs(params),
    queryFn: () =>
      listTranscodeJobs({
        page: params.page,
        pageSize: params.pageSize,
        status: params.status,
      }),
    enabled: isAuthReady && Boolean(getAdminToken()),
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
    enabled: isAuthReady && Boolean(getAdminToken()),
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

  return { jobsQuery, countsQuery, retryMutation, isAuthReady };
}

export function useSubscriptionPlans() {
  const queryClient = useQueryClient();
  const isAuthReady = useClientAuthReady();

  const plansQuery = useQuery({
    queryKey: queryKeys.subscriptionPlans,
    queryFn: listAdminSubscriptionPlans,
    enabled: isAuthReady && Boolean(getAdminToken()),
    staleTime: 5 * 60_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionPlans });
  };

  return { plansQuery, invalidate, isAuthReady };
}

export function useGenres() {
  const isAuthReady = useClientAuthReady();
  return useQuery({
    queryKey: queryKeys.genres,
    queryFn: listGenres,
    enabled: isAuthReady,
    staleTime: 60_000,
  });
}

export function useCreateGenre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createGenre(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.genres });
    },
  });
}

export function useDeleteGenre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGenre(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.genres });
    },
  });
}

export type {
  ApiGenre,
  ApiPaymentIntent,
  ApiSubscriptionPlan,
  ApiTopTitleReport,
  ApiUser,
  TranscodeJob,
};
