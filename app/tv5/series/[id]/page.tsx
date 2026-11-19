import { AdminShell } from "../../../components/AdminShell";
import { SeriesDetail } from "../../../series/[id]/SeriesDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Tv5SeriesDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AdminShell title="TV5 series detail">
      <SeriesDetail seriesId={id} />
    </AdminShell>
  );
}
