import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { ReportsTopTitles } from "./ReportsTopTitles";

export default function ReportsPage() {
  return (
    <AdminShell title="Reports">
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ReportsTopTitles />

        <AdminCard title="Report exports">
          <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
            <p className="text-[13px] font-semibold text-text">No report exports connected</p>
            <p className="mt-1 text-[12px] text-text-muted">
              Export buttons will appear here after report export endpoints are available.
            </p>
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
