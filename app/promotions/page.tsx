"use client";

import { AdminShell } from "../components/AdminShell";
import { HomeSectionsManager } from "../components/HomeSectionsManager";

export default function PromotionsPage() {
  return (
    <AdminShell title="Home page">
      <HomeSectionsManager />
    </AdminShell>
  );
}
