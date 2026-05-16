import { AdminShell } from "../components/AdminShell";
import { MovieManagementSection } from "./MovieManagementSection";

export default function MoviePage() {
  return (
    <AdminShell title="Movie management">
      <MovieManagementSection />
    </AdminShell>
  );
}
