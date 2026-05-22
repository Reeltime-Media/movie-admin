"use client";

import { AdminShell } from "../components/AdminShell";
import { SubscriptionPlanCreator } from "../components/SubscriptionPlanCreator";

export default function PlansPage() {
  return (
    <AdminShell title="Subscription plans">
      <SubscriptionPlanCreator />
    </AdminShell>
  );
}
