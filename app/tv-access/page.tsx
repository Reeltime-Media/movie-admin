"use client";

import { AdminShell } from "../components/AdminShell";
import { TvAccessCodeManager } from "../components/TvAccessCodeManager";

export default function TvAccessPage() {
  return (
    <AdminShell title="TV access IDs">
      <TvAccessCodeManager />
    </AdminShell>
  );
}
