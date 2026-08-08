import { AdminShell } from "../../components/AdminShell";
import { TvChannelDetail } from "./TvChannelDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TvChannelDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AdminShell title="TV channel">
      <TvChannelDetail channelId={id} />
    </AdminShell>
  );
}
