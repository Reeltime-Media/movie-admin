"use client";

import { AdminShell } from "../components/AdminShell";
import { HeroFeaturedManager } from "../components/HeroFeaturedManager";
import { PromotionBannerManager } from "../components/PromotionBannerManager";
import { adminPageStackClass } from "../lib/adminUi";

export default function PromotionsPage() {
  return (
    <AdminShell title="Home page">
      <div className={adminPageStackClass}>
        <HeroFeaturedManager />
        <PromotionBannerManager />
      </div>
    </AdminShell>
  );
}
