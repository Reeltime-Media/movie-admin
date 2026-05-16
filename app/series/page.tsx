import { AdminShell } from "../components/AdminShell";
import { SeriesPageBody } from "./SeriesPageBody";

export default function SeriesPage() {
  return (
    <AdminShell title="Series operations">
      <SeriesPageBody />
    </AdminShell>
  );
}
