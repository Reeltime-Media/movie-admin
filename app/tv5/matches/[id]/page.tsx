"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AdminErrorAlert } from "../../../components/AdminErrorAlert";
import { AdminShell } from "../../../components/AdminShell";
import { InlineLoading } from "../../../components/InlineLoading";
import { useClientAuthReady } from "../../../hooks/adminQueries";
import { getAdminMovie, getAdminToken } from "../../../lib/api";
import { queryKeys } from "../../../lib/queryKeys";
import { MatchForm } from "../MatchForm";

export default function EditMatchPage() {
  const { id } = useParams<{ id: string }>();
  const isAuthReady = useClientAuthReady();
  const query = useQuery({
    queryKey: queryKeys.tv5Match(id),
    queryFn: () => getAdminMovie(id),
    enabled: isAuthReady && Boolean(getAdminToken()),
  });

  return (
    <AdminShell title="Edit Kun Khmer match">
      {query.isLoading ? (
        <InlineLoading label="Loading match" />
      ) : query.error || !query.data ? (
        <AdminErrorAlert
          message={query.error instanceof Error ? query.error.message : "Match not found."}
          onRetry={() => void query.refetch()}
        />
      ) : query.data.app !== "tv5" ? (
        <AdminErrorAlert message="This title belongs to Reeltime. Edit it under Movies." />
      ) : (
        <MatchForm key={query.data.updated_at} existing={query.data} />
      )}
    </AdminShell>
  );
}
