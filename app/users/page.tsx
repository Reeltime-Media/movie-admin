"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "../components/AdminCard";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminErrorAlert } from "../components/AdminErrorAlert";
import { AdminPagination } from "../components/AdminPagination";
import { AdminStatCard } from "../components/AdminStatCard";
import { AdminTable, AdminTableHead, AdminTableWrap, AdminTh } from "../components/AdminTable";
import { InlineLoading } from "../components/InlineLoading";
import { AdminShell } from "../components/AdminShell";
import { Button } from "../components/ui/Button";
import { adminBadgeClass, adminTdClass } from "../lib/adminUi";
import { deleteUser, setUserActive, type ApiUser } from "../lib/api";
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

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ApiUser | null>(null);

  const handleToggleActive = async (user: ApiUser) => {
    setBusyId(user.id);
    try {
      await setUserActive(user.id, !user.is_active);
      toast.success(user.is_active ? "User suspended" : "User reactivated");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update user");
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemoveUser = async () => {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    try {
      await deleteUser(confirmDelete.id);
      toast.success("User deleted");
      setConfirmDelete(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete user");
    } finally {
      setBusyId(null);
    }
  };

  const stats = [
    {
      label: "Total users",
      value: (summary?.users.total ?? total).toLocaleString(),
      hint: "All accounts in the platform.",
    },
    {
      label: "Active users",
      value: summary?.users.active != null ? summary.users.active.toLocaleString() : "--",
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
                    <AdminTh>Name</AdminTh>
                    <AdminTh>Email</AdminTh>
                    <AdminTh>Role</AdminTh>
                    <AdminTh>Status</AdminTh>
                    <AdminTh>Joined</AdminTh>
                    <AdminTh className="text-right">Actions</AdminTh>
                  </AdminTableHead>
                  <tbody className="divide-y divide-border">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className={`${adminTdClass} font-semibold text-text`}>
                          {user.full_name || "Unnamed user"}
                        </td>
                        <td className={`${adminTdClass} text-text-muted`}>{user.email}</td>
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
                        <td className={`${adminTdClass} text-right`}>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busyId === user.id}
                              onClick={() => void handleToggleActive(user)}
                            >
                              {user.is_active ? "Suspend" : "Reactivate"}
                            </Button>
                            <Button
                              type="button"
                              variant="danger-soft"
                              size="sm"
                              disabled={busyId === user.id}
                              onClick={() => setConfirmDelete(user)}
                            >
                              Delete
                            </Button>
                          </div>
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

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-md">
            <h2 id="delete-user-title" className="text-lg font-bold tracking-[-0.02em]">
              Delete user
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              Permanently delete{" "}
              <span className="font-bold text-text">
                {confirmDelete.full_name || confirmDelete.email}
              </span>
              ? This cannot be undone. Users with payments or purchases can&rsquo;t be deleted —
              suspend them instead.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={busyId === confirmDelete.id}
                onClick={() => void confirmRemoveUser()}
              >
                {busyId === confirmDelete.id ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
