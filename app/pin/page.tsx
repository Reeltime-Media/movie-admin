"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { ThemeToggle } from "../components/ThemeToggle";
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
      window.location.assign("/login");
      return;
    } catch {
      setError("Could not verify PIN. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg px-6 text-text">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[380px]">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-brand text-sm font-black text-white">
            R
          </div>
          <p className="mt-4 text-2xs font-semibold uppercase tracking-[0.16em] text-text-disabled">
            Security check
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-text">Enter admin PIN</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Required before opening the sign-in page.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
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
            <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
