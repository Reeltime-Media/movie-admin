import { AdminShell } from "../components/AdminShell";
import { SeriesManagementSection } from "./SeriesManagementSection";

export default function SeriesPage() {
  return (
    <AdminShell title="Series management">
      <SeriesManagementSection />
    </AdminShell>
  );
}
