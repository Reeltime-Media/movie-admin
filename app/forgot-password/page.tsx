import Link from "next/link";
import { pageTitleClassName } from "../lib/pageTitle";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-text">
      <section className="w-full max-w-[430px] rounded-xl border border-border bg-surface p-6 shadow-sm">
        <Link href="/login" className="mb-8 flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-[15px] font-black text-white">
            R
          </div>
          <div>
            <div className="text-sm font-black tracking-[0.08em] text-text">REELTIME</div>
            <div className="text-2xs font-semibold text-text-muted">Admin console</div>
          </div>
        </Link>

        <div className="text-2xs font-bold uppercase tracking-[0.16em] text-text-muted">
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

        <Link
          href="/login"
          className="mt-5 inline-flex text-sm font-semibold text-text-muted transition-colors hover:text-text"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
