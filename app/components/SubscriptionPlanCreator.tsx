"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AdminCard } from "./AdminCard";
import {
  createAdminSubscriptionPlan,
  deleteAdminSubscriptionPlan,
  listAdminSubscriptionPlans,
  updateAdminSubscriptionPlan,
  type ApiSubscriptionPlan,
} from "../lib/api";

type PlanFormState = {
  code: string;
  name: string;
  description: string;
  priceUsd: string;
  billingIntervalDays: string;
  isActive: boolean;
  sortOrder: string;
};

const emptyForm = (): PlanFormState => ({
  code: "",
  name: "",
  description: "",
  priceUsd: "",
  billingIntervalDays: "30",
  isActive: true,
  sortOrder: "0",
});

function formatPrice(value: string) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return value;
  return parsed.toFixed(2);
}

export function SubscriptionPlanCreator() {
  const [plans, setPlans] = useState<ApiSubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ApiSubscriptionPlan | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPlans(await listAdminSubscriptionPlans());
    } catch (err) {
      let message = err instanceof Error ? err.message : "Could not load subscription plans.";
      if (message.includes("subscription_plans") || message.includes("alembic upgrade")) {
        message = `${message} Run: cd movie-api && alembic upgrade head`;
      }
      setError(message);
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPlans();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPlans]);

  useEffect(() => {
    if (!showForm) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) closeForm();
    };
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [showForm, isSaving]);

  const openCreateForm = () => {
    setEditingPlan(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEditForm = (plan: ApiSubscriptionPlan) => {
    setEditingPlan(plan);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? "",
      priceUsd: plan.price_usd,
      billingIntervalDays: String(plan.billing_interval_days),
      isActive: plan.is_active,
      sortOrder: String(plan.sort_order),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPlan(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.priceUsd.trim()) {
      toast.error("Name and price are required.");
      return;
    }
    if (!editingPlan && !form.code.trim()) {
      toast.error("Plan code is required.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingPlan) {
        const updated = await updateAdminSubscriptionPlan(editingPlan.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          priceUsd: form.priceUsd.trim(),
          billingIntervalDays: Number.parseInt(form.billingIntervalDays, 10) || 30,
          isActive: form.isActive,
          sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        });
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        toast.success("Plan updated.");
      } else {
        const created = await createAdminSubscriptionPlan({
          code: form.code.trim().toLowerCase().replace(/\s+/g, "_"),
          name: form.name.trim(),
          description: form.description.trim() || null,
          priceUsd: form.priceUsd.trim(),
          billingIntervalDays: Number.parseInt(form.billingIntervalDays, 10) || 30,
          isActive: form.isActive,
          sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        });
        setPlans((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
        toast.success("Plan created.");
      }
      closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (plan: ApiSubscriptionPlan) => {
    if (!window.confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    setIsSaving(true);
    try {
      await deleteAdminSubscriptionPlan(plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      toast.success("Plan deleted.");
      if (editingPlan?.id === plan.id) closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const formTitle = editingPlan ? "Edit plan" : "New plan";
  const formTitleId = "subscription-plan-form-title";

  return (
    <>
    <AdminCard
      title="Subscription plans"
      action="Add plan"
      actionOnClick={openCreateForm}
    >
      <p className="mb-4 text-[13px] leading-relaxed text-text-muted">
        Manage Reeltime Plus and other subscription tiers. The first active plan (by sort order) is
        used for new checkouts.
      </p>

      {error ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-4 text-[12px] text-warning">
          <div>{error}</div>
          <button type="button" onClick={() => void loadPlans()} className="mt-2 font-bold hover:underline">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <p className="text-[13px] text-text-muted">Loading plans...</p>
      ) : plans.length === 0 ? (
            <div className="rounded-md border border-dashed border-border py-8 text-center">
              <p className="text-[13px] text-text-muted">No subscription plans yet.</p>
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-2 text-[12px] font-semibold text-brand hover:underline"
              >
                Add your first plan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-bg p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13px] font-bold">{plan.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          plan.is_active
                            ? "bg-success/15 text-success"
                            : "bg-text-disabled/25 text-text-muted"
                        }`}
                      >
                        {plan.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-text-disabled">{plan.code}</p>
                    {plan.description && (
                      <p className="mt-1 text-[12px] text-text-muted">{plan.description}</p>
                    )}
                    <p className="mt-1 text-[11px] text-text-muted">
                      ${formatPrice(plan.price_usd)}/period · {plan.billing_interval_days} days · sort{" "}
                      {plan.sort_order}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(plan)}
                      disabled={isSaving}
                      className="rounded-md border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(plan)}
                      disabled={isSaving}
                      className="rounded-md border border-brand/30 bg-brand/10 px-3 py-2 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
    </AdminCard>

    {showForm ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={formTitleId}
        onClick={() => {
          if (!isSaving) closeForm();
        }}
      >
        <form
          onSubmit={(e) => void handleSubmit(e)}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={formTitleId} className="text-[16px] font-bold tracking-[-0.02em]">
                {formTitle}
              </h2>
              {editingPlan ? (
                <p className="mt-1 text-[12px] text-text-muted">
                  Code: <span className="font-mono font-semibold text-text">{editingPlan.code}</span>
                </p>
              ) : (
                <p className="mt-1 text-[12px] text-text-muted">
                  Create a new subscription tier for checkout.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              aria-label="Close"
              className="shrink-0 rounded-md border border-border px-2 py-1 text-[18px] leading-none text-text-muted transition-colors hover:border-border-hover hover:text-text disabled:opacity-40"
            >
              ×
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {!editingPlan && (
              <label className="block">
                <span className="text-[11px] font-semibold text-text-muted">Code</span>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. series_monthly"
                  className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                  required
                />
                <span className="mt-1 block text-[10px] text-text-disabled">
                  Lowercase letters, numbers, and underscores only.
                </span>
              </label>
            )}
            <label className="block">
              <span className="text-[11px] font-semibold text-text-muted">Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Reeltime Plus"
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                required
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-text-muted">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-[11px] font-semibold text-text-muted">Price (USD)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.priceUsd}
                  onChange={(e) => setForm((f) => ({ ...f, priceUsd: e.target.value }))}
                  placeholder="6.99"
                  className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                  required
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-text-muted">Billing days</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.billingIntervalDays}
                  onChange={(e) => setForm((f) => ({ ...f, billingIntervalDays: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-text-muted">Sort order</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] text-text"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-[12px] text-text-muted">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-border"
              />
              Active (available for new subscriptions)
            </label>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              className="rounded-md border border-border bg-bg px-4 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-brand px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {isSaving ? "Saving..." : editingPlan ? "Save changes" : "Create plan"}
            </button>
          </div>
        </form>
      </div>
    ) : null}
    </>
  );
}
