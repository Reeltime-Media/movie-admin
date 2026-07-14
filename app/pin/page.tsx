"use client";

import { pageTitleClassName } from "../lib/pageTitle";

import { useState } from "react";
import { toast } from "react-toastify";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";

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
      <div className="w-full max-w-[380px] rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="text-2xs font-bold uppercase tracking-[0.16em] text-text-muted">
          Security check
        </div>
        <h1 className={["mt-2", pageTitleClassName].join(" ")}>Enter admin PIN</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          This PIN step is required before opening the admin sign-in page.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Field label="PIN code" htmlFor="pin-code">
            <Input
              id="pin-code"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
            />
          </Field>

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? "Verifying..." : "Continue"}
          </Button>
        </form>

        {error ? (
          <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
