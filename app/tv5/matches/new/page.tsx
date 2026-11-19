"use client";

import { AdminShell } from "../../../components/AdminShell";
import { MatchForm } from "../MatchForm";

export default function NewMatchPage() {
  return (
    <AdminShell title="Add Kun Khmer match">
      <MatchForm />
    </AdminShell>
  );
}
