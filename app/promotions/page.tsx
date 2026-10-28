"use client";

import { AdminShell } from "../components/AdminShell";
import { HomeSectionsManager } from "../components/HomeSectionsManager";
import { adminPageStackClass } from "../lib/adminUi";

export default function PromotionsPage() {
  return (
    <AdminShell title="Home page">
      <div className={adminPageStackClass}>
        <p className="text-sm text-text-muted">
          Drag sections to set landing-page order. Open a section to rename it, toggle
          visibility, and curate movies, series, or TV channels.
        </p>
        <HomeSectionsManager />
      </div>
    </AdminShell>
  );
}
