"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { clearAdminToken, getAdminToken } from "../lib/api";
import { pageTitleClassName } from "../lib/pageTitle";
import { useUploadProgress } from "./UploadProgressContext";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Movies", href: "/movie" },
  { label: "Series", href: "/series" },
  { label: "Users", href: "/users" },
  { label: "Payments", href: "/payments" },
  { label: "Revenue", href: "/revenue" },
  { label: "Plans", href: "/plans" },
  { label: "Home page", href: "/promotions" },
  { label: "Transcode", href: "/transcode" },
  { label: "Reports", href: "/reports" },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center justify-between rounded-lg border border-transparent px-3 py-2.5 text-sm font-semibold transition-colors",
              active
                ? "border-brand/40 bg-brand text-white"
                : "text-text-muted hover:border-border hover:bg-surface-elevated hover:text-text",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
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

  return (
    <div className="min-h-screen bg-bg text-text">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col overflow-y-auto border-r border-border bg-surface/95 px-5 py-5 backdrop-blur-md lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-[15px] font-black text-white">
            R
          </div>
          <div>
            <div className="text-base font-extrabold tracking-[0.06em]">REELTIME</div>
            <div className="text-2xs font-semibold text-text-muted">Admin console</div>
          </div>
        </Link>

        <div className="mt-8">
          <NavList />
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-auto flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-border-hover hover:bg-surface-elevated hover:text-text"
        >
          <LogOut size={16} aria-hidden />
          Sign out
        </button>
      </aside>

      {/* Mobile navigation drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[80%] flex-col overflow-y-auto border-r border-border bg-surface px-5 py-5">
            <div className="flex items-center justify-between gap-2.5">
              <Link
                href="/"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-[15px] font-black text-white">
                  R
                </div>
                <div>
                  <div className="text-base font-extrabold tracking-[0.06em]">REELTIME</div>
                  <div className="text-2xs font-semibold text-text-muted">Admin console</div>
                </div>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileNavOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-border-hover hover:text-text"
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            <div className="mt-8">
              <NavList onNavigate={() => setMobileNavOpen(false)} />
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-auto flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-border-hover hover:bg-surface-elevated hover:text-text"
            >
              <LogOut size={16} aria-hidden />
              Sign out
            </button>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-border bg-surface-soft/90 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  aria-label="Open menu"
                  aria-expanded={mobileNavOpen}
                  onClick={() => setMobileNavOpen(true)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:border-border-hover hover:text-text lg:hidden"
                >
                  <Menu size={18} aria-hidden />
                </button>
                <div className="min-w-0">
                  <div className="text-2xs font-bold uppercase tracking-[0.16em] text-text-muted">
                    Reeltime operations
                  </div>
                  <h1 className={["mt-1 truncate", pageTitleClassName].join(" ")}>
                    {title}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Upload progress dropdown */}
                {jobs.length > 0 ? (
                  <div ref={dropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setUploadsOpen((o) => !o)}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-border-hover hover:bg-surface-elevated hover:text-text"
                    >
                      {activeJobs.length > 0 ? (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
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
                        <span className="tabular-nums font-bold text-text">
                          {activeJobs[0].percent}%
                        </span>
                      ) : null}
                      <span className="text-text-disabled">{uploadsOpen ? "▲" : "▼"}</span>
                    </button>

                    {uploadsOpen ? (
                      <div className="absolute right-0 top-full z-50 mt-1.5 w-80 rounded-xl border border-border bg-surface shadow-md">
                        <div className="border-b border-border px-4 py-2.5">
                          <span className="text-2xs font-bold uppercase tracking-[0.12em] text-text-disabled">
                            Upload jobs
                          </span>
                        </div>
                        <div className="max-h-72 overflow-y-auto p-2">
                          {jobs.map((job) => (
                            <div
                              key={job.id}
                              className="rounded-lg px-3 py-3 transition-colors hover:bg-surface-elevated"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-text" title={job.title}>
                                    {job.title}
                                  </p>
                                  <p className="truncate text-2xs text-text-muted">{job.label}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  {job.status === "uploading" && (
                                    <span className="tabular-nums text-xs font-bold text-text-muted">
                                      {job.percent}%
                                    </span>
                                  )}
                                  {job.status === "done" && (
                                    <span className="text-xs font-bold text-success">Done</span>
                                  )}
                                  {job.status === "error" && (
                                    <span className="text-xs font-bold text-danger">Error</span>
                                  )}
                                  {job.status !== "uploading" ? (
                                    <button
                                      type="button"
                                      onClick={() => dismissJob(job.id)}
                                      aria-label="Dismiss"
                                      className="text-lg leading-none text-text-disabled hover:text-text"
                                    >
                                      ×
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-elevated">
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
                              onClick={() => jobs.filter((j) => j.status !== "uploading").forEach((j) => dismissJob(j.id))}
                              className="text-xs text-text-disabled hover:text-text-muted"
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
