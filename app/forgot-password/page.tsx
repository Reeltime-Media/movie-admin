import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-text">
      <section className="w-full max-w-[430px] rounded-xl border border-border bg-surface p-6 shadow-2xl shadow-black/25">
        <Link href="/login" className="mb-8 flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-brand text-[15px] font-black text-white">
            R
          </div>
          <div>
            <div className="text-[13px] font-black tracking-[0.08em] text-white">REELTIME</div>
            <div className="text-[11px] font-semibold text-text-muted">Admin console</div>
          </div>
        </Link>

        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">
          Account recovery
        </div>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-[-0.03em]">
          Reset your password
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
          Enter your staff email and Reeltime will send reset instructions if the account has admin
          access.
        </p>

        <form className="mt-6 space-y-4" action="/login" method="get">
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

          <button
            type="submit"
            className="w-full rounded-md bg-brand py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Send reset link
          </button>
        </form>

        <Link
          href="/login"
          className="mt-5 inline-flex text-[13px] font-semibold text-text-muted transition-colors hover:text-text"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
