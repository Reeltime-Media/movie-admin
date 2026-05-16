import { AdminShell } from "../../components/AdminShell";
import { MovieDetail } from "./MovieDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AdminShell title="Movie detail">
      <MovieDetail movieId={id} />
    </AdminShell>
  );
}
