import { AdminShell } from "../../components/AdminShell";
import { PodcastDetail } from "./PodcastDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PodcastDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AdminShell title="Podcast detail">
      <PodcastDetail podcastId={id} />
    </AdminShell>
  );
}
