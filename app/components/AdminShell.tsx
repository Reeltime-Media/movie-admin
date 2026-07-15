"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CreditCard,
  Film,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Server,
  Tv,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { clearAdminToken, getAdminToken } from "../lib/api";
import { useUploadProgress } from "./UploadProgressContext";

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { heading: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    heading: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    heading: "Catalog",
    items: [
      { label: "Movies", href: "/movie", icon: Film },
      { label: "Series", href: "/series", icon: Tv },
      { label: "Home page", href: "/promotions", icon: Home },
    ],
  },
  {
    heading: "Business",
    items: [
      { label: "Revenue", href: "/revenue", icon: Wallet },
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "Plans", href: "/plans", icon: BarChart3 },
      { label: "Users", href: "/users", icon: Users },
    ],
  },
  {
    heading: "System",
    items: [
      { label: "Transcode", href: "/transcode", icon: Server },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
];

function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" onClick={onNavigate} className="group flex items-center gap-2.5">
      <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-brand text-[15px] font-bold text-white shadow-[0_0_16px_rgba(229,9,20,0.45)]">
        R
      </div>
      <div className="leading-none">
        <div className="text-sm font-bold tracking-[0.14em] text-text">REELTIME</div>
        <div className="mt-1 text-2xs font-medium tracking-wide text-text-disabled">
          Admin console
        </div>
      </div>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {navGroups.map((group) => (
        <div key={group.heading}>
          <div className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-[0.18em] text-text-disabled">
            {group.heading}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-brand-soft text-text"
                      : "text-text-muted hover:bg-surface-elevated hover:text-text",
                  ].join(" ")}
                >
                  {/* Active rail — reads faster than a filled block at a glance. */}
                  <span
                    className={[
                      "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full transition-all",
                      active ? "bg-brand opacity-100" : "opacity-0",
                    ].join(" ")}
                  />
                  <Icon
                    size={15}
                    strokeWidth={2}
                    className={active ? "text-brand" : "text-text-disabled group-hover:text-text-muted"}
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
  children,
}: {
  title?: string;
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

  // Prevent background scroll while the mobile drawer is open.
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

  const signOutButton = (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
    >
      <LogOut size={15} strokeWidth={2} className="text-text-disabled" aria-hidden />
      Sign out
    </button>
  );

  return (
    <div className="min-h-screen bg-bg text-text">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col overflow-y-auto border-r border-border bg-surface-soft px-4 py-5 lg:flex">
        <Wordmark />
        <div className="mt-8 flex-1">
          <NavList />
        </div>
        <div className="mt-4 border-t border-border pt-3">{signOutButton}</div>
      </aside>

      {/* Mobile navigation drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col overflow-y-auto border-r border-border bg-surface-soft px-4 py-5">
            <div className="flex items-center justify-between gap-2.5">
              <Wordmark onNavigate={() => setMobileNavOpen(false)} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileNavOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                <X size={15} aria-hidden />
              </button>
            </div>

            <div className="mt-8 flex-1">
              <NavList onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <div className="mt-4 border-t border-border pt-3">{signOutButton}</div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-60">
        <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen(true)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-text-muted transition-colors hover:border-border-hover hover:text-text lg:hidden"
              >
                <Menu size={17} aria-hidden />
              </button>
              <h1 className="truncate text-xl font-semibold tracking-[-0.02em] text-text">
                {title}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Upload progress dropdown */}
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
                      <span className="font-mono text-2xs font-semibold text-text">
                        {activeJobs[0].percent}%
                      </span>
                    ) : null}
                  </button>

                  {uploadsOpen ? (
                    <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/60">
                      <div className="border-b border-border px-4 py-2.5">
                        <span className="text-2xs font-semibold uppercase tracking-[0.16em] text-text-disabled">
                          Upload jobs
                        </span>
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
                                  <span className="font-mono text-2xs font-semibold text-text-muted">
                                    {job.percent}%
                                  </span>
                                )}
                                {job.status === "done" && (
                                  <span className="text-2xs font-semibold text-success">Done</span>
                                )}
                                {job.status === "error" && (
                                  <span className="text-2xs font-semibold text-danger">Error</span>
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

        <main className="flex-1 px-5 py-6 md:px-8">
          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
