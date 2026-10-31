"use client";

import { AdminShell } from "../components/AdminShell";
import { HomeSectionsManager } from "../components/HomeSectionsManager";
import { adminPageStackClass } from "../lib/adminUi";

export default function PromotionsPage() {
  return (
    <AdminShell title="Home page">
      <div className={adminPageStackClass}>
        <p className="text-sm text-text-muted">
          Pick a section tab to curate it. Use Earlier / Later and Visible in the header to
          set home order and visibility.
        </p>
        <HomeSectionsManager />
      </div>
    </AdminShell>
  );
}
