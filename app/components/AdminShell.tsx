"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearAdminToken, getAdminToken } from "../lib/api";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Movies", href: "/movie" },
  { label: "Series", href: "/series" },
  { label: "Users", href: "/users" },
  { label: "Payments", href: "/payments" },
  { label: "Reports", href: "/reports", badge: "New" },
];

export function AdminShell({
  title = "Content dashboard",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/login");
    }
    const handleAuthCleared = () => router.replace("/login");
    window.addEventListener("reeltime-admin-auth-cleared", handleAuthCleared);
    return () => window.removeEventListener("reeltime-admin-auth-cleared", handleAuthCleared);
  }, [router]);

  const handleSignOut = () => {
    clearAdminToken();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-surface/80 px-5 py-5 lg:block">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-brand text-[15px] font-black text-white">
              R
            </div>
            <div>
              <div className="text-[14px] font-extrabold tracking-[0.06em]">REELTIME</div>
              <div className="text-[11px] font-semibold text-text-muted">Admin console</div>
            </div>
          </Link>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const active =
                pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex items-center justify-between rounded-md px-3 py-2.5 text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-brand text-white"
                      : "text-text-muted hover:bg-surface-elevated hover:text-text",
                  ].join(" ")}
                >
                  {item.label}
                  {item.badge ? (
                    <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-md border border-border bg-bg p-4">
            <div className="text-[12px] font-bold">Client parity</div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
              Movies, pricing, and subscription states mirror the current Reeltime client.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">
                  Reeltime operations
                </div>
                <h1 className="mt-1 text-[24px] font-extrabold tracking-[-0.03em]">
                  {title}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text-muted transition-colors hover:border-border-hover hover:text-text"
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-5 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
