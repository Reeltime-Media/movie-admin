import { AdminShell } from "../../../components/AdminShell";
import { MovieEditForm } from "../../MovieEditForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MovieEditPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AdminShell title="Edit movie">
      <MovieEditForm movieId={id} />
    </AdminShell>
  );
}
