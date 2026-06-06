import { AdminShell } from "../../../components/AdminShell";
import { SeriesEditForm } from "../../SeriesEditForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SeriesEditPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AdminShell title="Edit series">
      <SeriesEditForm seriesId={id} />
    </AdminShell>
  );
}
