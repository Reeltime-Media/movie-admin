import { AdminShell } from "../components/AdminShell";
import { SeriesManagementSection } from "../series/SeriesManagementSection";

export default function ShortSeriesPage() {
  return (
    <AdminShell title="Short series management">
      <SeriesManagementSection shortForm />
    </AdminShell>
  );
}
