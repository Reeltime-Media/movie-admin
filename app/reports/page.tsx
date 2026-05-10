import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { catalog, reportCards } from "../lib/adminData";

export default function ReportsPage() {
  return (
    <AdminShell title="Reports">
      <div className="grid gap-4 md:grid-cols-3">
        {reportCards.map((card) => (
          <div key={card.title} className="rounded-lg border border-border bg-surface p-5">
            <div className="text-[12px] font-semibold text-text-muted">{card.title}</div>
            <div className="mt-3 text-[24px] font-extrabold tracking-[-0.03em]">
              {card.value}
            </div>
            <div className="mt-1 text-[12px] font-semibold text-text-muted">{card.detail}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminCard title="Top titles">
          <div className="space-y-4">
            {catalog.map((item, index) => (
              <div key={item.title}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-bold">
                    {index + 1}. {item.title}
                  </span>
                  <span className="text-text-muted">{item.views}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(18, 90 - index * 14)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Report exports">
          <div className="space-y-3">
            {["Revenue CSV", "Subscriber cohort", "Catalog performance", "Refund audit"].map(
              (label) => (
                <button
                  key={label}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-bg px-4 py-3 text-left text-[13px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
                >
                  {label}
                  <span className="text-brand">Download</span>
                </button>
              ),
            )}
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
