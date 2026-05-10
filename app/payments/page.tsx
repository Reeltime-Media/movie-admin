import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { payments, revenueMix } from "../lib/adminData";

export default function PaymentsPage() {
  return (
    <AdminShell title="Payments and pricing">
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AdminCard title="Revenue mix">
          <div className="space-y-5">
            {revenueMix.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-bold">{item.label}</span>
                  <span className="text-text-muted">
                    {item.amount} · {item.share}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                  <div className={`h-full rounded-full bg-brand ${item.bar}`} />
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Recent transactions" action="Export">
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-widest text-text-disabled">
                  <th className="px-5 pb-3 font-bold">ID</th>
                  <th className="px-5 pb-3 font-bold">Customer</th>
                  <th className="px-5 pb-3 font-bold">Item</th>
                  <th className="px-5 pb-3 font-bold">Amount</th>
                  <th className="px-5 pb-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.id} className="text-[13px]">
                    <td className="px-5 py-4 font-bold">{payment.id}</td>
                    <td className="px-5 py-4 text-text-muted">{payment.customer}</td>
                    <td className="px-5 py-4 text-text-muted">{payment.item}</td>
                    <td className="px-5 py-4 text-text-muted">{payment.amount}</td>
                    <td className="px-5 py-4 text-text-muted">{payment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {["Movie rental price", "Monthly subscription", "Ownership purchases"].map((label) => (
          <div key={label} className="rounded-lg border border-border bg-surface p-5">
            <div className="text-[12px] font-semibold text-text-muted">{label}</div>
            <div className="mt-3 text-[24px] font-extrabold tracking-[-0.03em]">
              {label === "Monthly subscription" ? "$6.99" : "$2.99 - $3.99"}
            </div>
            <button className="mt-4 rounded-md border border-border bg-bg px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text">
              Edit pricing
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
