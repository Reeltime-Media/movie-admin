# Admin UI Consistency & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every `movie-admin` screen feel like one product by building shared UI primitives, reconciling the token/class layer into one canonical set, and sweeping every page onto it — no behavior changes.

**Architecture:** Foundation-first. (1) Add design tokens (type scale) to `globals.css`. (2) Build primitives in `app/components/ui/`. (3) Reconcile `lib/adminUi.ts` + the existing `Admin*` kit onto the tokens. (4) Sweep pages group-by-group onto the primitives. (5) Grep-audit the consistency rules. Only markup/className/structure changes — handlers, state, data-fetching, and mutations are untouchable.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (`@theme`), TypeScript, lucide-react.

**Reference spec:** `docs/superpowers/specs/2026-07-15-admin-ui-consistency-design.md`

## Verification model (read first)

This repo has **no unit-test runner**. The change is visual/structural. "Tests" in this plan are real, runnable checks:

- **Typecheck:** `npx tsc --noEmit` — must pass with no new errors.
- **Lint:** `npm run lint` — must pass.
- **Structural assertions:** `grep` commands with an expected count (e.g. "0 matches"). These are the acceptance criteria for the sweep tasks.
- **Build (phase gate):** `npm run build` at the end of each phase.
- **Visual (final):** drive the app via the `/run` skill and confirm each page group renders and its primary flows work.

Do **not** add jest/vitest — that's out of scope.

## File map

**Create:**
- `app/components/ui/Button.tsx` — the one button.
- `app/components/ui/Field.tsx` — `Field`, `Input`, `Textarea`, exported `controlClass`.
- `app/components/ui/Badge.tsx` — status pill wrapper.
- `app/components/ui/FormSection.tsx` — titled grouped form section + grid.
- `app/components/ui/index.ts` — barrel export.

**Modify (foundation):**
- `app/globals.css` — add type-scale `@theme` block.
- `app/lib/adminUi.ts` — reconcile radius + type classes; make button strings aliases.
- `app/components/AdminCard.tsx`, `AdminStatCard.tsx`, `AdminSelect.tsx` — token alignment.

**Modify (sweep):** every `app/**/page.tsx` and the section/form/manager components listed per task.

---

## Phase 0 — Tokens

### Task 1: Add the type scale to globals.css

**Files:**
- Modify: `app/globals.css`

Tailwind v4 generates `text-*` utilities from `--text-*` theme keys. Adding a `--text-2xs` key creates a `text-2xs` utility. Overriding `--text-sm`/`--text-base` retunes those utilities to the admin scale. Existing code uses `text-[Npx]` literals, so this does not change any current rendering — new/migrated code picks up the scale.

- [ ] **Step 1: Add a `@theme` block for the type scale**

Add this block immediately after the existing `@theme inline { … }` block (around line 53), as a **separate** `@theme` block (font sizes are literals, not var references, so they do not use `inline`):

```css
@theme {
  --text-2xs: 11px;
  --text-2xs--line-height: 1.45;
  --text-xs: 12px;
  --text-xs--line-height: 1.45;
  --text-sm: 13px;
  --text-sm--line-height: 1.5;
  --text-base: 14px;
  --text-base--line-height: 1.55;
  --text-lg: 16px;
  --text-lg--line-height: 1.4;
  --text-xl: 20px;
  --text-xl--line-height: 1.3;
  --text-2xl: 24px;
  --text-2xl--line-height: 1.25;
  --text-stat: 30px;
  --text-stat--line-height: 1.05;
}
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS. Build succeeds; no CSS errors.

- [ ] **Step 3: Verify the utilities exist**

Create a throwaway check: temporarily add `<div className="text-2xs text-stat" />` mentally — instead, confirm via grep that Tailwind will pick these up (no runtime check needed; the build succeeding with the block present is the confirmation). If `npm run build` fails referencing `@theme`, verify the Tailwind v4 syntax against `node_modules/tailwindcss` docs before proceeding.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(ui): add admin type scale tokens (text-2xs … text-stat)"
```

---

## Phase 1 — Primitives

### Task 2: Button component

**Files:**
- Create: `app/components/ui/Button.tsx`

Public variants match the spec (`primary`, `secondary`, `ghost`, `danger`) plus `danger-soft` for subtle inline/row deletes (the two existing delete styles map to `danger` = solid confirm and `danger-soft` = outline row action).

- [ ] **Step 1: Write the component**

```tsx
"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50";

const sizeClass: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-[0_1px_3px_rgba(229,9,20,0.25),0_0_0_1px_rgba(229,9,20,0.08)] hover:bg-brand-hover hover:shadow-[0_2px_8px_rgba(229,9,20,0.35),0_0_0_1px_rgba(229,9,20,0.12)] active:scale-[0.98] active:shadow-none disabled:shadow-none",
  secondary:
    "border border-border bg-surface text-text-muted hover:border-border-hover hover:bg-surface-elevated hover:text-text",
  ghost: "text-text-muted hover:bg-surface-elevated hover:text-text",
  danger:
    "bg-danger text-white hover:bg-danger/90 active:scale-[0.98]",
  "danger-soft":
    "border border-danger/40 bg-danger/10 text-danger hover:border-danger/55 hover:bg-danger/15",
};

function content(loading: boolean, icon: ReactNode | undefined, children: ReactNode) {
  return (
    <>
      {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : icon}
      {children}
    </>
  );
}

type CommonProps = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof CommonProps> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof CommonProps> & { href: string };

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    className = "",
    children,
    ...rest
  } = props;

  const cls = [base, sizeClass[size], variantClass[variant], className].filter(Boolean).join(" ");

  if ("href" in props && props.href) {
    const { href, ...linkRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={cls} {...linkRest}>
        {content(loading, icon, children)}
      </Link>
    );
  }

  const btnRest = rest as ComponentPropsWithoutRef<"button">;
  return (
    <button className={cls} disabled={loading || btnRest.disabled} {...btnRest}>
      {content(loading, icon, children)}
    </button>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/components/ui/Button.tsx
git commit -m "feat(ui): add Button primitive"
```

### Task 3: Field + Input + Textarea

**Files:**
- Create: `app/components/ui/Field.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export const controlClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-disabled focus:border-border-hover focus:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60";

export const fieldLabelClass =
  "mb-1.5 block text-2xs font-bold uppercase tracking-[0.12em] text-text-disabled";

export function Input({
  error = false,
  className = "",
  ...props
}: { error?: boolean } & ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={[controlClass, error ? "border-danger focus:border-danger" : "", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function Textarea({
  error = false,
  className = "",
  ...props
}: { error?: boolean } & ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={[controlClass, "min-h-20 resize-y", error ? "border-danger focus:border-danger" : "", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={fieldLabelClass}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/components/ui/Field.tsx
git commit -m "feat(ui): add Field, Input, Textarea primitives"
```

### Task 4: Badge component

**Files:**
- Create: `app/components/ui/Badge.tsx`

Wraps the existing `adminBadgeClass` so tones are declared once.

- [ ] **Step 1: Write the component**

```tsx
import type { ReactNode } from "react";
import { adminBadgeClass, type AdminBadgeTone } from "../../lib/adminUi";

export function Badge({
  tone = "muted",
  className = "",
  children,
}: {
  tone?: AdminBadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return <span className={[adminBadgeClass(tone), className].filter(Boolean).join(" ")}>{children}</span>;
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add app/components/ui/Badge.tsx
git commit -m "feat(ui): add Badge primitive"
```

### Task 5: FormSection component

**Files:**
- Create: `app/components/ui/FormSection.tsx`

Groups related fields with a title/description and a responsive 2-column grid. A field that must span the full width wraps in `<div className="md:col-span-2">` (documented via the `FullRow` helper).

- [ ] **Step 1: Write the component**

```tsx
import type { ReactNode } from "react";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border pt-6 first:border-t-0 first:pt-0">
      <div className="mb-4">
        <h3 className="text-base font-bold tracking-[-0.01em] text-text">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-text-muted">{description}</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

/** Wrap a field in this to make it span both columns inside a FormSection grid. */
export function FullRow({ children }: { children: ReactNode }) {
  return <div className="md:col-span-2">{children}</div>;
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add app/components/ui/FormSection.tsx
git commit -m "feat(ui): add FormSection primitive"
```

### Task 6: Barrel export

**Files:**
- Create: `app/components/ui/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
export { Button } from "./Button";
export { Field, Input, Textarea, controlClass, fieldLabelClass } from "./Field";
export { Badge } from "./Badge";
export { FormSection, FullRow } from "./FormSection";
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add app/components/ui/index.ts
git commit -m "feat(ui): barrel export for ui primitives"
```

---

## Phase 2 — Reconcile the existing kit

### Task 7: Reconcile `lib/adminUi.ts`

**Files:**
- Modify: `app/lib/adminUi.ts`

Apply these exact replacements (radius → tokens; `text-[Npx]` → type classes). Button strings stay for now (pages migrate to `<Button>` in Phase 3) but are retuned to match `Button` so any un-migrated usage still looks right.

- [ ] **Step 1: Apply replacements**

| Const | Change |
|------|--------|
| `adminStatCardClass` | `rounded-lg` → `rounded-xl`; add ` shadow-sm` |
| `adminLabelClass` | `text-[11px]` → `text-2xs` |
| `adminInputClass` | `rounded-md` → `rounded-lg`; `text-[13px]` → `text-sm` |
| `adminTableClass` | `text-[13px]` → `text-sm` |
| `adminTableHeadRowClass` | `text-[11px]` → `text-2xs` |
| `adminBadgeBase` | `text-[10px]` → `text-2xs` |
| `adminTabClass` | `rounded-md` → `rounded-lg`; `text-[12px]` → `text-xs` |
| `adminUnderlineTabClass` | `text-[12px]` → `text-xs` |
| `adminPrimaryButtonClass` | `rounded-md` → `rounded-lg`; `text-[12px]` → `text-xs`; `px-4 py-2` → `px-4 py-2.5`; add ` py-2.5`→match Button md |
| `adminGhostButtonClass` | `rounded-md` → `rounded-lg`; `text-[12px]` → `text-xs` |
| `adminDeleteButtonClass` | `rounded-md` → `rounded-lg`; `text-[11px]` → `text-2xs` |
| `adminDeleteButtonClassWide` | `rounded-md` → `rounded-lg`; `text-[11px]` → `text-2xs` |
| `adminDeleteConfirmButtonClass` | `rounded-md` → `rounded-lg`; `text-[12px]` → `text-xs` |
| `adminPaginationPageClass` | `rounded-md` → `rounded-lg`; `text-[12px]` → `text-xs` |

Add a row-hover + numeric helper for tables at the end of the file:

```ts
export const adminTrClass = "border-b border-border/70 transition-colors hover:bg-surface-elevated/60";
export const adminTdNumClass = "px-5 py-3.5 text-right tabular-nums";
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Assert no stale radius/type literals remain in this file**

Run: `grep -nE 'rounded-md|rounded-sm|text-\[1[0-3]px\]' app/lib/adminUi.ts`
Expected: no matches (exit 1 / empty output).

- [ ] **Step 4: Commit**

```bash
git add app/lib/adminUi.ts
git commit -m "refactor(ui): reconcile adminUi class tokens (radius, type scale, table hover)"
```

### Task 8: AdminCard uses Button; drop private button

**Files:**
- Modify: `app/components/AdminCard.tsx`

- [ ] **Step 1: Replace the private `actionButtonClass` header button with `Button`**

Remove the `PlusIcon` local svg + `actionButtonClass` const, import `Button` and lucide `Plus`, and render:

```tsx
import { Plus } from "lucide-react";
import { Button } from "./ui/Button";
```

The header action becomes (for the `action` string case):

```tsx
{headerAction ? (
  headerAction
) : action && actionHref ? (
  <Button href={actionHref} size="sm" icon={<Plus size={14} aria-hidden />}>
    {action}
  </Button>
) : action ? (
  <Button type="button" onClick={actionOnClick} size="sm" icon={<Plus size={14} aria-hidden />}>
    {action}
  </Button>
) : null}
```

Keep `rounded-xl` on the `<section>`; add ` shadow-sm`. Update the title from `text-[14px]` → `text-base`.

- [ ] **Step 2: Typecheck + assert**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `grep -nE 'actionButtonClass|rounded-md|text-\[1' app/components/AdminCard.tsx`
Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add app/components/AdminCard.tsx
git commit -m "refactor(ui): AdminCard uses Button primitive"
```

### Task 9: AdminStatCard token alignment

**Files:**
- Modify: `app/components/AdminStatCard.tsx`

- [ ] **Step 1: Apply**

- `rounded-lg` → `rounded-xl`; add ` shadow-sm` to the card `div`.
- label `text-[12px]` → `text-xs`.
- value `text-[26px]` → `text-stat`.
- hint `text-[12px]` → `text-xs`.

- [ ] **Step 2: Typecheck + assert + commit**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `grep -nE 'rounded-lg|text-\[' app/components/AdminStatCard.tsx`
Expected: no matches.

```bash
git add app/components/AdminStatCard.tsx
git commit -m "refactor(ui): AdminStatCard token alignment"
```

### Task 10: Align remaining kit components

**Files:**
- Modify: `app/components/AdminSelect.tsx`, `AdminEmptyState.tsx`, `AdminErrorAlert.tsx`, `AdminPagination.tsx`, `AdminSectionTabs.tsx`, `InlineLoading.tsx`

- [ ] **Step 1: Apply token swaps to each**

For each file, replace: `rounded-md`→`rounded-lg` on controls / `rounded-xl` on dropdown-panels & alert cards; `text-[13px]`→`text-sm`, `text-[12px]`→`text-xs`, `text-[11px]`→`text-2xs`, `text-[10px]`→`text-2xs`. Specifically in `AdminSelect.tsx`: the listbox `<ul>` `rounded-md … shadow-sm` → `rounded-xl … shadow-md`; option `text-[13px]` → `text-sm`. Leave all logic/handlers untouched.

- [ ] **Step 2: Typecheck + assert per file**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `grep -rnE 'rounded-md|rounded-sm|text-\[1[0-3]px\]' app/components/AdminSelect.tsx app/components/AdminEmptyState.tsx app/components/AdminErrorAlert.tsx app/components/AdminPagination.tsx app/components/AdminSectionTabs.tsx app/components/InlineLoading.tsx`
Expected: no matches.

- [ ] **Step 3: Phase gate — build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/components/AdminSelect.tsx app/components/AdminEmptyState.tsx app/components/AdminErrorAlert.tsx app/components/AdminPagination.tsx app/components/AdminSectionTabs.tsx app/components/InlineLoading.tsx
git commit -m "refactor(ui): align remaining Admin kit to tokens"
```

---

## Phase 3 — Page sweep

**Sweep rules (apply in every task below):**
1. Replace inline `bg-brand …` / bordered / delete buttons with `<Button variant=… size=…>`.
2. Replace bare styled `<input>`/`<textarea>` + hand-rolled labels with `<Field><Input/></Field>` / `<Textarea/>`.
3. Replace `text-[Npx]` literals with the type class (`13px→sm`, `12px→xs`, `11px/10px→2xs`, `14px→base`, `16px→lg`).
4. Replace `rounded-md`/`rounded-sm` with `rounded-lg` (controls) or `rounded-xl` (cards/panels).
5. Replace status text with `<Badge tone=…>`.
6. **Do not touch** state, handlers, effects, data fetching, or mutation calls.

Per-file acceptance grep (run after each task, scoped to the files touched):
`grep -rnE 'rounded-md|rounded-sm|text-\[1[0-46]px\]|className="[^"]*bg-brand [^"]*(px-|py-)' <files>` → expected no matches (the `bg-brand` clause catches inline buttons; `bg-brand` on non-button accents like the logo tile is exempt — verify any hit is a logo/dot, not a button).

### Task 11: Outliers — login, pin, dashboard

**Files:**
- Modify: `app/login/page.tsx`, `app/pin/page.tsx`, `app/page.tsx`

- [ ] **Step 1: login** — replace the submit button with `<Button variant="primary" size="md" loading={isSubmitting} className="w-full">`; email/password inputs → `<Field label=…><Input/></Field>`; keep the `loginAdmin` call and toast logic exactly.
- [ ] **Step 2: pin** — same treatment: `<Field>`/`<Input>` for the PIN, `<Button>` for submit; keep `fetch("/api/pin/verify")` and state.
- [ ] **Step 3: dashboard (`app/page.tsx`)** — ensure stat cards use `AdminStatCard`/`AdminStatGrid`; any inline buttons/links → `<Button>`; `text-[Npx]` → type classes. Do not change `useDashboardSummary` usage.
- [ ] **Step 4: Typecheck + assert + build**

Run: `npx tsc --noEmit`
Run: `grep -rnE 'rounded-md|rounded-sm|text-\[1[0-46]px\]' app/login/page.tsx app/pin/page.tsx app/page.tsx`
Expected: no matches (verify any `bg-brand` hit is the logo tile, not a button).
Run: `npm run build` → PASS.
- [ ] **Step 5: Commit**

```bash
git add app/login/page.tsx app/pin/page.tsx app/page.tsx
git commit -m "refactor(ui): sweep login, pin, dashboard onto primitives"
```

### Task 12: Movies

**Files:**
- Modify: `app/movie/page.tsx`, `app/movie/MovieManagementSection.tsx`, `app/movie/MovieManagementTable.tsx`, `app/movie/MovieEditForm.tsx`, `app/movie/MovieCommentsAdmin.tsx`, `app/movie/movieDetailUi.tsx`

- [ ] **Step 1: MovieEditForm** — wrap field groups in `<FormSection title=… description=…>` (suggested groups: "Basics" title/slug/year, "Media" posters/trailer, "Classification" genres/rating, "Availability" flags/dates). Each control → `<Field>`+`<Input>`/`<Textarea>`/`AdminSelect`. Full-width fields use `<FullRow>`. Submit/cancel → `<Button variant="primary">` / `<Button variant="secondary">`. **Keep every handler, state var, and submit logic identical.**
- [ ] **Step 2: Tables/section** — `MovieManagementTable` rows use `adminTrClass`; numeric cells use `adminTdNumClass`; row action buttons → `<Button size="sm" variant="secondary"|"danger-soft">`; statuses → `<Badge>`.
- [ ] **Step 3: page/section/comments/detail** — button + type + radius swaps per sweep rules.
- [ ] **Step 4: Typecheck + assert + build**

Run: `npx tsc --noEmit`
Run: `grep -rnE 'rounded-md|rounded-sm|text-\[1[0-46]px\]' app/movie/`
Expected: no matches (verify residual `bg-brand` hits are non-buttons).
Run: `npm run build` → PASS.
- [ ] **Step 5: Commit**

```bash
git add app/movie/
git commit -m "refactor(ui): sweep Movies pages onto primitives + FormSection"
```

### Task 13: Series

**Files:**
- Modify: `app/series/page.tsx`, `app/series/SeriesManagementSection.tsx`, `app/series/SeriesManagementTable.tsx`, `app/series/SeriesEditForm.tsx`, `app/components/SeasonsEpisodesEditor.tsx`, `app/components/EpisodeAssetsUploader.tsx`

- [ ] **Step 1: SeriesEditForm** — same `FormSection` + `Field`/`Input` treatment as MovieEditForm. Keep handlers/state.
- [ ] **Step 2: SeasonsEpisodesEditor + EpisodeAssetsUploader** — buttons → `<Button>`; inputs → `<Field>`/`<Input>`; radius/type swaps. Keep upload logic untouched.
- [ ] **Step 3: table/section/page** — sweep rules.
- [ ] **Step 4: Typecheck + assert + build**

Run: `npx tsc --noEmit`
Run: `grep -rnE 'rounded-md|rounded-sm|text-\[1[0-46]px\]' app/series/ app/components/SeasonsEpisodesEditor.tsx app/components/EpisodeAssetsUploader.tsx`
Expected: no matches (verify residual `bg-brand` hits are non-buttons).
Run: `npm run build` → PASS.
- [ ] **Step 5: Commit**

```bash
git add app/series/ app/components/SeasonsEpisodesEditor.tsx app/components/EpisodeAssetsUploader.tsx
git commit -m "refactor(ui): sweep Series pages onto primitives + FormSection"
```

### Task 14: Dashboard data pages

**Files:**
- Modify: `app/revenue/page.tsx`, `app/payments/page.tsx`, `app/users/page.tsx`, `app/transcode/page.tsx`, `app/reports/page.tsx`, `app/components/RevenuePanel.tsx`, `app/components/DashboardRevenue.tsx`, `app/components/DashboardTopMovies.tsx`

- [ ] **Step 1:** Apply sweep rules to each. Statuses (payment state, transcode state, user active/inactive) → `<Badge tone=…>`. Amount/count columns → `adminTdNumClass`. Filter/action buttons → `<Button>`. Keep all query hooks and handlers.
- [ ] **Step 2: Typecheck + assert + build**

Run: `npx tsc --noEmit`
Run: `grep -rnE 'rounded-md|rounded-sm|text-\[1[0-46]px\]' app/revenue/ app/payments/ app/users/ app/transcode/ app/reports/ app/components/RevenuePanel.tsx app/components/DashboardRevenue.tsx app/components/DashboardTopMovies.tsx`
Expected: no matches (verify residual `bg-brand` hits are non-buttons).
Run: `npm run build` → PASS.
- [ ] **Step 3: Commit**

```bash
git add app/revenue/ app/payments/ app/users/ app/transcode/ app/reports/ app/components/RevenuePanel.tsx app/components/DashboardRevenue.tsx app/components/DashboardTopMovies.tsx
git commit -m "refactor(ui): sweep dashboard data pages onto primitives + Badge"
```

### Task 15: Home page & Plans

**Files:**
- Modify: `app/promotions/page.tsx`, `app/plans/page.tsx`, `app/components/HeroFeaturedManager.tsx`, `app/components/HeroSlideMediaFields.tsx`, `app/components/PromotionBannerManager.tsx`, `app/components/FreeTodayManager.tsx`, `app/components/SubscriptionPlanCreator.tsx`, `app/components/TrailerPreview.tsx`

- [ ] **Step 1:** Apply sweep rules. These are the largest managers (`HeroFeaturedManager` ~943 lines) — work section by section, keeping all state machines and upload/mutation logic identical. Forms → `<Field>`/`<Input>`; grouped forms → `<FormSection>`; buttons → `<Button>`.
- [ ] **Step 2: Typecheck + assert + build**

Run: `npx tsc --noEmit`
Run: `grep -rnE 'rounded-md|rounded-sm|text-\[1[0-46]px\]' app/promotions/ app/plans/ app/components/HeroFeaturedManager.tsx app/components/HeroSlideMediaFields.tsx app/components/PromotionBannerManager.tsx app/components/FreeTodayManager.tsx app/components/SubscriptionPlanCreator.tsx app/components/TrailerPreview.tsx`
Expected: no matches (verify residual `bg-brand` hits are non-buttons).
Run: `npm run build` → PASS.
- [ ] **Step 3: Commit**

```bash
git add app/promotions/ app/plans/ app/components/HeroFeaturedManager.tsx app/components/HeroSlideMediaFields.tsx app/components/PromotionBannerManager.tsx app/components/FreeTodayManager.tsx app/components/SubscriptionPlanCreator.tsx app/components/TrailerPreview.tsx
git commit -m "refactor(ui): sweep Home page & Plans onto primitives"
```

---

## Phase 4 — Final audit

### Task 16: Consistency audit + visual verification

**Files:** none (verification only)

- [ ] **Step 1: Global anti-pattern grep (the "law")**

Run each; every one must return **no matches** (exempting known non-button `bg-brand` accents like the logo tile / status dots — inspect any hit):

```bash
grep -rnE 'rounded-(md|sm)' app --include=*.tsx | grep -v node_modules
grep -rnE 'text-\[1[0-46]px\]' app --include=*.tsx
grep -rnE 'className="[^"]*bg-brand [^"]*py-' app --include=*.tsx    # inline primary buttons
```

For any legitimate remaining match, confirm it's an intentional exception and note it; otherwise fix and amend the relevant commit.

- [ ] **Step 2: Confirm no behavior/data files changed**

Run: `git diff --name-only main...HEAD | grep -E 'app/api/|lib/api.ts|hooks/|adminData.ts|adminQueries'`
Expected: no matches (only UI/markup files changed).

- [ ] **Step 3: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all PASS.

- [ ] **Step 4: Visual verification via /run**

Use the `/run` skill to start the app. Confirm each group renders and primary flows work: sign in (login), open the dashboard, open a movie edit form (FormSection groups render, save works), open a table + its row actions, open the `AdminSelect` dropdown, open the mobile nav drawer, open the Home page hero manager. Note anything visually broken and fix before finishing.

- [ ] **Step 5: Final commit (if audit fixes were made)**

```bash
git add -A
git commit -m "refactor(ui): final consistency audit fixes"
```

---

## Self-review notes

- **Spec coverage:** tokens (Task 1), Button/Field/Badge/FormSection primitives (Tasks 2–6), reconcile adminUi + AdminCard/StatCard/Select/kit (Tasks 7–10), page sweep across all groups incl. outliers (Tasks 11–15), consistency-rules audit + no-behavior-change check (Task 16). All spec sections map to a task.
- **No dark mode / no nav redesign** — honored (not in any task).
- **Verification** adapted to a repo with no test runner: typecheck + lint + build + grep assertions + `/run` visual pass. Grep patterns are the concrete acceptance criteria.
- **Behavior safety** enforced by the "do not touch handlers/state/data" rule in every sweep task plus the Task 16 Step 2 diff check.
