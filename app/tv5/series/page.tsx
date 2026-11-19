import { AdminShell } from "../../components/AdminShell";
import { SeriesManagementSection } from "../../series/SeriesManagementSection";

export default function Tv5SeriesPage() {
  return (
    <AdminShell title="TV5 series">
      <SeriesManagementSection app="tv5" />
    </AdminShell>
  );
}
