"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CreditCard,
  Film,
  Headphones,
  Home,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Radio,
  RectangleVertical,
  Server,
  Tv,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { clearAdminToken, getAdminToken } from "../lib/api";
import { BrandWordmark } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import { useUploadProgress } from "./UploadProgressContext";

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { label?: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  { items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }] },
  {
    label: "Content",
    items: [
      { label: "Movies", href: "/movie", icon: Film },
      { label: "Series", href: "/series", icon: Tv },
      { label: "Short series", href: "/short-series", icon: RectangleVertical },
      { label: "Podcasts", href: "/podcast", icon: Headphones },
      { label: "TV channels", href: "/tv-channels", icon: Radio },
      { label: "Home page", href: "/promotions", icon: Home },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Revenue", href: "/revenue", icon: Wallet },
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "Plans", href: "/plans", icon: Layers },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Users", href: "/users", icon: Users },
      { label: "TV access IDs", href: "/tv-access", icon: KeyRound },
      { label: "Transcode", href: "/transcode", icon: Server },
    ],
  },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-5">
      {navGroups.map((group, index) => (
        <div key={group.label ?? index}>
          {group.label ? (
            <p className="mb-1 px-2.5 text-xs text-text-disabled">{group.label}</p>
          ) : null}
          <div className="space-y-px">
            {group.items.map((item) => {
              // Keep /series from lighting up on /short-series routes.
              const active =
                item.href === "/series"
                  ? pathname === "/series" || pathname.startsWith("/series/")
                  : pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
                    active
                      ? "bg-surface-elevated font-medium text-text"
                      : "text-text-muted hover:bg-surface-elevated hover:text-text",
                  ].join(" ")}
                >
                  <Icon
                    size={15}
                    strokeWidth={1.75}
                    className={
                      active ? "text-brand" : "text-text-disabled group-hover:text-text-muted"
                    }
                    aria-hidden
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({
  title = "Content dashboard",
  headerAction,
  lockViewport = false,
  children,
}: {
  title?: string;
  /** Optional control shown on the right of the page title (e.g. Back button). */
  headerAction?: React.ReactNode;
  /** Fit content to one screen with no page scroll (dashboard). */
  lockViewport?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { jobs, dismissJob } = useUploadProgress();
  const [uploadsOpen, setUploadsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeJobs = jobs.filter((j) => j.status === "uploading");

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/login");
    }
    const handleAuthCleared = () => router.replace("/login");
    window.addEventListener("reeltime-admin-auth-cleared", handleAuthCleared);
    return () => window.removeEventListener("reeltime-admin-auth-cleared", handleAuthCleared);
  }, [router]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!uploadsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUploadsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [uploadsOpen]);

  const handleSignOut = () => {
    clearAdminToken();
    router.push("/login");
  };

  const sidebarFooter = (
    <div className="flex items-center justify-between gap-2 border-t border-border p-3">
      <button
        type="button"
        onClick={handleSignOut}
        className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
      >
        <LogOut size={15} strokeWidth={1.75} className="text-text-disabled" aria-hidden />
        Sign out
      </button>
      <ThemeToggle iconOnly />
    </div>
  );

  const sidebarInner = (
    <>
      <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
        <BrandWordmark onNavigate={mobileNavOpen ? () => setMobileNavOpen(false) : undefined} />
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 py-4">
        <NavList onNavigate={mobileNavOpen ? () => setMobileNavOpen(false) : undefined} />
      </div>
      {sidebarFooter}
    </>
  );

  return (
    <div
      className={[
        "min-h-screen bg-bg text-text",
        lockViewport ? "fit:h-dvh fit:min-h-0 fit:overflow-hidden" : "",
      ].join(" ")}
    >
      <aside className="fixed left-0 top-0 z-30 hidden h-dvh w-56 flex-col overflow-hidden border-r border-border bg-sidebar lg:flex">
        {sidebarInner}
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-overlay"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[84%] flex-col overflow-hidden border-r border-border bg-sidebar shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-5">
              <BrandWordmark onNavigate={() => setMobileNavOpen(false)} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileNavOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
              >
                <X size={15} aria-hidden />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-2.5 py-4">
                <NavList onNavigate={() => setMobileNavOpen(false)} />
              </div>
              {sidebarFooter}
            </div>
          </aside>
        </div>
      ) : null}

      <div
        className={[
          "flex min-h-screen min-w-0 flex-col lg:ml-56",
          lockViewport ? "fit:h-dvh fit:min-h-0 fit:overflow-hidden" : "",
        ].join(" ")}
      >
        <header className="sticky top-0 z-20 shrink-0 border-b border-border bg-bg">
          <div className="mx-auto flex min-h-14 w-full max-w-[1360px] flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(true)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-elevated hover:text-text lg:hidden"
              >
                <Menu size={17} aria-hidden />
              </button>
              <h1 className="truncate text-lg font-semibold tracking-tight text-text">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
              {headerAction}
              <div className="lg:hidden">
                <ThemeToggle />
              </div>
              {jobs.length > 0 ? (
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setUploadsOpen((o) => !o)}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-border-hover hover:text-text"
                  >
                    {activeJobs.length > 0 ? (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
                      </span>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    )}
                    <span className="max-w-32 truncate">
                      {activeJobs.length > 1
                        ? `${activeJobs.length} uploading`
                        : activeJobs.length === 1
                          ? activeJobs[0].title
                          : "Uploads"}
                    </span>
                    {activeJobs.length === 1 ? (
                      <span className="tabular-nums text-text">
                        {activeJobs[0].percent}%
                      </span>
                    ) : null}
                  </button>

                  {uploadsOpen ? (
                    <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                      <div className="border-b border-border px-4 py-2.5">
                        <span className="text-xs font-medium text-text-muted">Upload jobs</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto p-1.5">
                        {jobs.map((job) => (
                          <div
                            key={job.id}
                            className="rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-elevated"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-text" title={job.title}>
                                  {job.title}
                                </p>
                                <p className="truncate text-2xs text-text-muted">{job.label}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {job.status === "uploading" && (
                                  <span className="text-xs tabular-nums text-text-muted">
                                    {job.percent}%
                                  </span>
                                )}
                                {job.status === "done" && (
                                  <span className="text-xs font-medium text-success">Done</span>
                                )}
                                {job.status === "error" && (
                                  <span className="text-xs font-medium text-danger">Error</span>
                                )}
                                {job.status !== "uploading" ? (
                                  <button
                                    type="button"
                                    onClick={() => dismissJob(job.id)}
                                    aria-label="Dismiss"
                                    className="text-text-disabled transition-colors hover:text-text"
                                  >
                                    <X size={13} aria-hidden />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-elevated">
                              <div
                                className={[
                                  "h-full rounded-full transition-all duration-300",
                                  job.status === "error"
                                    ? "bg-danger"
                                    : job.status === "done"
                                      ? "bg-success"
                                      : "bg-brand",
                                ].join(" ")}
                                style={{ width: `${job.percent}%` }}
                              />
                            </div>
                            {job.status === "error" && job.errorMsg ? (
                              <p className="mt-1 text-2xs text-danger">{job.errorMsg}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {jobs.some((j) => j.status !== "uploading") ? (
                        <div className="border-t border-border px-4 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              jobs
                                .filter((j) => j.status !== "uploading")
                                .forEach((j) => dismissJob(j.id))
                            }
                            className="text-2xs text-text-disabled transition-colors hover:text-text-muted"
                          >
                            Dismiss completed
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main
          className={[
            "flex w-full min-w-0 flex-1 flex-col px-4 sm:px-6 lg:px-8",
            lockViewport ? "py-4 fit:min-h-0 fit:overflow-hidden" : "py-6",
          ].join(" ")}
        >
          <div
            className={[
              "mx-auto w-full min-w-0 max-w-[1296px] flex-1",
              lockViewport ? "flex flex-col gap-4 fit:min-h-0 fit:overflow-hidden" : "space-y-6",
            ].join(" ")}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
