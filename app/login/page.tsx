"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { loginAdmin } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setIsSubmitting(true);
    try {
      await loginAdmin(String(fd.get("email") || ""), String(fd.get("password") || ""));
      toast.success("Signed in successfully");
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-bg text-text">
      <section className="relative hidden w-[44%] flex-col justify-between overflow-hidden border-r border-border p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 25% 20%, rgba(229,9,20,0.14), transparent 34%), linear-gradient(140deg, #fef2f2, #f8fafc 48%, #eff6ff)",
          }}
        />
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-brand text-[15px] font-black text-white">
            R
          </div>
          <div>
            <div className="text-[13px] font-black tracking-[0.08em] text-text">REELTIME</div>
            <div className="text-[11px] font-semibold text-text-muted">Admin console</div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
            Restricted access
          </div>
          <h1 className="text-[34px] font-extrabold leading-tight tracking-[-0.04em] text-text">
            Manage content, pricing, and subscribers from one console.
          </h1>
          <p className="mt-4 text-[13px] leading-relaxed text-text-muted">
            This admin area controls what appears in the Reeltime client, including rentals,
            premium series, publishing queues, and customer payments.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[410px]">
          <Link href="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-brand text-[15px] font-black text-white">
              R
            </div>
            <span className="text-[13px] font-black tracking-[0.08em] text-text">REELTIME</span>
          </Link>

          <div className="rounded-xl border border-border bg-surface p-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">
                Admin sign in
              </div>
              <h2 className="mt-2 text-[26px] font-extrabold tracking-[-0.03em]">
                Welcome back
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
                Use your Reeltime staff account to access movies and payment tools.
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">
                  Work email
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@reeltime.com"
                  className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">
                  Password
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated"
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[12px] font-medium text-text-muted">
                  <input
                    type="checkbox"
                    name="remember"
                    className="h-3.5 w-3.5 rounded border-border bg-bg accent-brand"
                  />
                  Keep me signed in
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[12px] font-semibold text-text-muted transition-colors hover:text-text"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-brand py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-hover"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {error ? (
              <div className="mt-5 rounded-md border border-warning/30 bg-warning/10 p-3 text-[12px] leading-relaxed text-warning">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
