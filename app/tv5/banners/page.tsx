"use client";

import { AdminShell } from "../../components/AdminShell";
import { HeroFeaturedManager } from "../../components/HeroFeaturedManager";

export default function Tv5BannersPage() {
  return (
    <AdminShell title="TV5 home banner">
      <HeroFeaturedManager app="tv5" />
    </AdminShell>
  );
}
