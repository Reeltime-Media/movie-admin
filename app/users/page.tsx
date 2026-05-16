"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminShell } from "../components/AdminShell";
import { listUsers, type ApiUser } from "../lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function UsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setUsers(await listUsers());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load users.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const stats = useMemo(
    () => [
      {
        label: "Total users",
        value: users.length.toString(),
        detail: "All accounts returned by the API.",
      },
      {
        label: "Admins",
        value: users.filter((user) => user.role === "admin").length.toString(),
        detail: "Accounts with admin access.",
      },
      {
        label: "Active users",
        value: users.filter((user) => user.is_active).length.toString(),
        detail: "Users currently marked active.",
      },
    ],
    [users],
  );

  return (
    <AdminShell title="User management">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface p-5">
            <div className="text-[12px] font-semibold text-text-muted">{stat.label}</div>
            <div className="mt-3 text-[28px] font-extrabold tracking-[-0.03em]">
              {isLoading ? "--" : stat.value}
            </div>
            <div className="mt-1 text-[12px] font-semibold text-text-muted">{stat.detail}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminCard title="Recent users">
          {error ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-4 text-[12px] text-warning">
              <div>{error}</div>
              <button type="button" onClick={loadUsers} className="mt-2 font-bold hover:underline">
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <p className="text-[13px] text-text-muted">Loading users...</p>
          ) : users.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-bg px-4 py-8 text-center">
              <p className="text-[13px] font-semibold text-text">No users found</p>
              <p className="mt-1 text-[12px] text-text-muted">
                New registered users will appear here.
              </p>
            </div>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-widest text-text-disabled">
                    <th className="px-5 pb-3 font-bold">User</th>
                    <th className="px-5 pb-3 font-bold">Role</th>
                    <th className="px-5 pb-3 font-bold">Status</th>
                    <th className="px-5 pb-3 font-bold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="text-[13px]">
                      <td className="px-5 py-4">
                        <div className="font-bold">{user.full_name || "Unnamed user"}</div>
                        <div className="mt-1 text-[12px] text-text-muted">{user.email}</div>
                      </td>
                      <td className="px-5 py-4 text-text-muted">{user.role}</td>
                      <td className="px-5 py-4">
                        <span
                          className={[
                            "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
                            user.is_active
                              ? "bg-success/15 text-success"
                              : "bg-text-disabled/25 text-text-muted",
                          ].join(" ")}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-text-muted">{formatDate(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>

        <AdminCard title="Admin access">
          {isLoading ? (
            <p className="text-[13px] text-text-muted">Loading roles...</p>
          ) : (
            <div className="space-y-3">
              {users
                .filter((user) => user.role === "admin")
                .map((user) => (
                  <div key={user.id} className="rounded-md border border-border bg-bg p-4">
                    <div className="text-[13px] font-bold">{user.full_name || user.email}</div>
                    <div className="mt-1 text-[12px] text-text-muted">{user.email}</div>
                  </div>
                ))}
              {users.every((user) => user.role !== "admin") ? (
                <p className="text-[13px] text-text-muted">No admin users found.</p>
              ) : null}
            </div>
          )}
        </AdminCard>
      </div>
    </AdminShell>
  );
}
