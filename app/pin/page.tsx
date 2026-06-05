"use client";

import { pageTitleClassName } from "../lib/pageTitle";

import { useState } from "react";
import { toast } from "react-toastify";

export default function PinPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ pin: pin.trim() }),
      });

      if (!res.ok) {
        setError("Invalid PIN. Please try again.");
        return;
      }

      toast.success("PIN accepted — redirecting to sign in");
      // Full navigation so the new httpOnly cookie is sent before middleware runs.
      window.location.assign("/login");
      return;
    } catch {
      setError("Could not verify PIN. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-text">
      <div className="w-full max-w-[380px] rounded-xl border border-border bg-surface p-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">
          Security check
        </div>
        <h1 className={["mt-2", pageTitleClassName].join(" ")}>Enter admin PIN</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
          This PIN step is required before opening the admin sign-in page.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-text-muted">PIN code</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full rounded-md border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-brand py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-hover"
          >
            {isSubmitting ? "Verifying..." : "Continue"}
          </button>
        </form>

        {error ? (
          <div className="mt-5 rounded-md border border-warning/30 bg-warning/10 p-3 text-[12px] leading-relaxed text-warning">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
