"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { loginAdmin } from "../lib/api";
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
    <main className="flex min-h-screen items-center justify-center bg-bg text-text">
      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[410px]">
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <div>
              <div className="text-2xs font-bold uppercase tracking-[0.16em] text-text-muted text-center">
                Admin sign in
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-center">Welcome back</h2>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
              <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
