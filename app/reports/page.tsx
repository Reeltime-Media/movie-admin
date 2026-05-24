import { AdminShell } from "../components/AdminShell";
import { ReportsTopTitles } from "./ReportsTopTitles";

export default function ReportsPage() {
  return (
    <AdminShell title="Reports">
      <div className="mt-6">
        <ReportsTopTitles />
      </div>
    </AdminShell>
  );
}
