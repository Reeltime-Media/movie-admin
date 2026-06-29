"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteCatalogEntry,
  fetchCatalog,
  updateCatalogEntry,
  type MovieDraft,
} from "../lib/catalog";
import { getAdminToken } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { useClientAuthReady } from "./adminQueries";

export type { MovieDraft } from "../lib/catalog";

export function useMovieCatalog() {
  const queryClient = useQueryClient();
  const isAuthReady = useClientAuthReady();

  const catalogQuery = useQuery({
    queryKey: queryKeys.catalog,
    queryFn: fetchCatalog,
    enabled: isAuthReady && Boolean(getAdminToken()),
    staleTime: 3 * 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, entry }: { id: string; entry: MovieDraft }) =>
      updateCatalogEntry(catalogQuery.data ?? [], id, entry),
    onSuccess: (movies) => {
      queryClient.setQueryData(queryKeys.catalog, movies);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCatalogEntry(catalogQuery.data ?? [], id),
    onSuccess: (movies) => {
      queryClient.setQueryData(queryKeys.catalog, movies);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    },
  });

  const catalogLoading = !isAuthReady || catalogQuery.isLoading;

  return {
    movies: catalogQuery.data ?? [],
    isLoading: catalogLoading,
    error: catalogQuery.error
      ? catalogQuery.error instanceof Error
        ? catalogQuery.error.message
        : "Could not load movies from API"
      : null,
    refreshMovies: async () => {
      await catalogQuery.refetch();
    },
    updateMovie: (id: string, entry: MovieDraft) => updateMutation.mutateAsync({ id, entry }),
    deleteMovie: (id: string) => deleteMutation.mutateAsync(id),
  };
}
