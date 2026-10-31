import { pageTitleClassName } from "../lib/pageTitle";
import { BackButton } from "../components/BackButton";
import { BrandWordmark } from "../components/BrandLogo";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";

export default function ForgotPasswordPage() {
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
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Enter your staff email and Reeltime will send reset instructions if the account has admin
          access.
        </p>

        <form className="mt-6 space-y-4" action="/login" method="get">
          <Field label="Work email" htmlFor="forgot-email">
            <Input
              id="forgot-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@reeltime.com"
            />
          </Field>

          <Button type="submit" className="w-full">
            Send reset link
          </Button>
        </form>

        <div className="mt-5">
          <BackButton href="/login" label="Back to sign in" size="md" />
        </div>
      </section>
    </main>
  );
}
