import { AdminShell } from "../../../../components/AdminShell";
import { SeriesEditForm } from "../../../../series/SeriesEditForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Tv5SeriesEditPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AdminShell title="Edit TV5 series">
      <SeriesEditForm seriesId={id} app="tv5" />
    </AdminShell>
  );
}
