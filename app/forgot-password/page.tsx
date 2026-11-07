"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { pageTitleClassName } from "../lib/pageTitle";
import { BackButton } from "../components/BackButton";
import { BrandWordmark } from "../components/BrandLogo";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-text">
      <section className="w-full max-w-[430px] rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-8">
          <BrandWordmark href="/login" subtitle="Admin console" />
        </div>

        <div className="text-xs font-medium text-text-muted">
          Account recovery
        </div>
        <h1 className={["mt-2", pageTitleClassName].join(" ")}>
          Reset your password
        </h1>

        {submitted ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold text-text">Recovery email sent</p>
                <p className="mt-1 text-text-muted">
                  If an admin account is registered for <strong className="text-text">{email}</strong>, password reset instructions have been sent.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <BackButton href="/login" label="Back to sign in" size="md" />
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              Enter your staff email and Reeltime will send reset instructions if the account has admin
              access.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Field label="Work email" htmlFor="forgot-email">
                <Input
                  id="forgot-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@reeltime.fun"
                />
              </Field>

              <Button type="submit" className="w-full">
                Send reset link
              </Button>
            </form>

            <div className="mt-5">
              <BackButton href="/login" label="Back to sign in" size="md" />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
