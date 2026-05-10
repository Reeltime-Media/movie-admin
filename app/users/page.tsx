import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { users } from "../lib/adminData";

export default function UsersPage() {
  return (
    <AdminShell title="User management">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total users", value: "8,921", detail: "+312 this month" },
          { label: "Premium users", value: "3,842", detail: "43% of accounts" },
          { label: "Support flags", value: "17", detail: "6 payment related" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface p-5">
            <div className="text-[12px] font-semibold text-text-muted">{stat.label}</div>
            <div className="mt-3 text-[28px] font-extrabold tracking-[-0.03em]">
              {stat.value}
            </div>
            <div className="mt-1 text-[12px] font-semibold text-text-muted">{stat.detail}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminCard title="Recent users" action="Invite user">
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-widest text-text-disabled">
                  <th className="px-5 pb-3 font-bold">Name</th>
                  <th className="px-5 pb-3 font-bold">Plan</th>
                  <th className="px-5 pb-3 font-bold">Library</th>
                  <th className="px-5 pb-3 font-bold">Spend</th>
                  <th className="px-5 pb-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.name} className="text-[13px]">
                    <td className="px-5 py-4 font-bold">{user.name}</td>
                    <td className="px-5 py-4 text-text-muted">{user.plan}</td>
                    <td className="px-5 py-4 text-text-muted">{user.library}</td>
                    <td className="px-5 py-4 text-text-muted">{user.spend}</td>
                    <td className="px-5 py-4 text-text-muted">{user.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard title="Admin access">
          <div className="space-y-3">
            {["Owner", "Content manager", "Finance", "Support"].map((role, index) => (
              <div
                key={role}
                className="flex items-center justify-between rounded-md border border-border bg-bg px-4 py-3"
              >
                <div className="text-[13px] font-bold">{role}</div>
                <div className="text-[12px] text-text-muted">{index + 1} active</div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
