"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HeroRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/promotions");
  }, [router]);
  return null;
}
