"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "../components/AdminShell";
import { AdminSectionTabs, type AdminSectionTab } from "../components/AdminSectionTabs";
import { FreeTodayManager } from "../components/FreeTodayManager";
import { HeroFeaturedManager } from "../components/HeroFeaturedManager";
import { PromotionBannerManager } from "../components/PromotionBannerManager";
import { adminPageStackClass } from "../lib/adminUi";
import { listAdminFreeToday, listAdminHeroFeatured, listAdminPromotionBanners } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";

type TabKey = "carousel" | "banners" | "freeToday";

export default function PromotionsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("carousel");

  const heroQuery = useQuery({
    queryKey: queryKeys.heroFeatured,
    queryFn: listAdminHeroFeatured,
  });

  const bannersQuery = useQuery({
    queryKey: queryKeys.promotionBanners,
    queryFn: listAdminPromotionBanners,
  });

  const freeTodayQuery = useQuery({
    queryKey: queryKeys.freeToday,
    queryFn: listAdminFreeToday,
  });

  const tabs: AdminSectionTab[] = useMemo(
    () => [
      {
        key: "carousel",
        label: "Carousel",
        badge: heroQuery.data?.length ?? 0,
      },
      {
        key: "banners",
        label: "Banners",
        badge: bannersQuery.data?.length ?? 0,
      },
      {
        key: "freeToday",
        label: "Free today",
        badge: freeTodayQuery.data?.length ?? 0,
      },
    ],
    [heroQuery.data, bannersQuery.data, freeTodayQuery.data],
  );

  return (
    <AdminShell title="Home page">
      <div className={adminPageStackClass}>
        <AdminSectionTabs
          tabs={tabs}
          active={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
          label="Home page sections"
        />

        {activeTab === "carousel" ? (
          <HeroFeaturedManager />
        ) : activeTab === "banners" ? (
          <PromotionBannerManager />
        ) : (
          <FreeTodayManager />
        )}
      </div>
    </AdminShell>
  );
}

