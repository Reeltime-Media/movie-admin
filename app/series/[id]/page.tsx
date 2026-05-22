import { AdminShell } from "../../components/AdminShell";
import { SeriesDetail } from "./SeriesDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SeriesDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AdminShell title="Series detail">
      <SeriesDetail seriesId={id} />
    </AdminShell>
  );
}
