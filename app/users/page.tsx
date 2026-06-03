"use client";

import { useState } from "react";
import { AdminCard } from "../components/AdminCard";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminErrorAlert } from "../components/AdminErrorAlert";
import { AdminPagination } from "../components/AdminPagination";
import { AdminStatCard } from "../components/AdminStatCard";
import { AdminTable, AdminTableHead, AdminTableWrap, AdminTh } from "../components/AdminTable";
import { InlineLoading } from "../components/InlineLoading";
import { AdminShell } from "../components/AdminShell";
import { adminBadgeClass, adminTdClass } from "../lib/adminUi";
import { useDashboardSummary, useUsers } from "../hooks/adminQueries";

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const {
    data: usersData,
    isLoading,
    isFetching,
    error: usersError,
    refetch,
  } = useUsers(page, PAGE_SIZE);
  const { data: summary } = useDashboardSummary();

  const users = usersData?.items ?? [];
  const pages = usersData?.pages ?? 1;
  const total = usersData?.total ?? 0;
  const error = usersError
    ? usersError instanceof Error
      ? usersError.message
      : "Could not load users."
    : null;

  const stats = [
    {
      label: "Total users",
      value: (summary?.users.total ?? total).toString(),
      hint: "All accounts in the platform.",
    },
    {
      label: "Active users",
      value: summary?.users.active != null ? String(summary.users.active) : "--",
      hint: "Users currently marked active.",
    },
  ];

  return (
    <AdminShell title="User management">
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((stat) => (
          <AdminStatCard
            key={stat.label}
            label={stat.label}
            value={isLoading && !users.length ? "--" : stat.value}
            hint={stat.hint}
          />
        ))}
      </div>

      <AdminCard title="Recent users" flush>
        {isLoading && !users.length ? (
          <InlineLoading label="Loading users" />
        ) : error ? (
          <AdminErrorAlert message={error} onRetry={() => void refetch()} />
        ) : users.length === 0 && !isLoading ? (
          <AdminEmptyState
            title="No users found"
            description="New registered users will appear here."
          />
        ) : (
          <>
            <AdminTableWrap>
              <div className="-mx-5">
                <AdminTable>
                  <AdminTableHead>
                    <AdminTh>User</AdminTh>
                    <AdminTh>Role</AdminTh>
                    <AdminTh>Status</AdminTh>
                    <AdminTh>Joined</AdminTh>
                  </AdminTableHead>
                  <tbody className="divide-y divide-border">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className={adminTdClass}>
                          <div className="font-semibold text-text">
                            {user.full_name || "Unnamed user"}
                          </div>
                          <div className="mt-0.5 text-[12px] text-text-muted">{user.email}</div>
                        </td>
                        <td className={`${adminTdClass} text-text-muted`}>{user.role}</td>
                        <td className={adminTdClass}>
                          <span
                            className={adminBadgeClass(user.is_active ? "success" : "muted")}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className={`${adminTdClass} text-text-muted`}>
                          {formatDate(user.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTable>
              </div>
            </AdminTableWrap>
            <AdminPagination
              page={page}
              pages={pages}
              total={total}
              pageSize={PAGE_SIZE}
              isLoading={isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </AdminCard>
    </AdminShell>
  );
}
