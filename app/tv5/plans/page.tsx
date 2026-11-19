"use client";

import { AdminShell } from "../../components/AdminShell";
import { SubscriptionPlanCreator } from "../../components/SubscriptionPlanCreator";

export default function Tv5PlansPage() {
  return (
    <AdminShell title="TV5 plans">
      <SubscriptionPlanCreator app="tv5" />
    </AdminShell>
  );
}
