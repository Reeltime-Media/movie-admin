"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { loginAdmin } from "../lib/api";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";

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
    <main className="relative flex min-h-screen items-center justify-center bg-bg px-6 text-text">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-brand text-sm font-black text-white">
            R
          </div>
          <p className="mt-4 text-2xs font-semibold uppercase tracking-[0.16em] text-text-disabled">
            Admin console
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-text">Sign in</h1>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Work email" htmlFor="login-email">
              <Input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@reeltime.com"
              />
            </Field>

            <Field label="Password" htmlFor="login-password">
              <Input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </Field>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-text-muted">
                <input
                  type="checkbox"
                  name="remember"
                  className="h-3.5 w-3.5 rounded border-border bg-bg accent-brand"
                />
                Keep me signed in
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-text-muted transition-colors hover:text-text"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {error ? (
            <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
