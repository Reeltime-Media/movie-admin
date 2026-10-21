import { AdminShell } from "../../../components/AdminShell";
import { PodcastEditForm } from "../../PodcastEditForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PodcastEditPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AdminShell title="Edit podcast">
      <PodcastEditForm podcastId={id} />
    </AdminShell>
  );
}
