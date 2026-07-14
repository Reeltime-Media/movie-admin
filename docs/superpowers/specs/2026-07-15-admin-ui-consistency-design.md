# Movie-Admin UI/UX Consistency & Polish — Design

**Date:** 2026-07-15
**Status:** Approved (direction), implementation planned
**Scope:** Visual + structural consistency pass across the entire `movie-admin` app. Light theme + brand red retained. No API, data-logic, or behavioral changes.

## Goal

Make every screen feel like one product. Today the app has a real foundation (semantic tokens in `globals.css`, a shared `Admin*` kit, `lib/adminUi.ts` class helpers) but it has **drifted**:

- **Radius is inconsistent:** buttons/inputs use `rounded-md`, stat cards `rounded-lg`, `AdminCard` `rounded-xl`.
- **Buttons have ~10 variants.** `AdminCard` even defines its own primary button that differs from `adminPrimaryButtonClass` (different radius, shadow, padding).
- **Type sizes are all ad-hoc** `text-[Npx]` literals (`text-[11px]`/`[12px]`/`[13px]`… ~10 distinct sizes) with no scale.
- **Adoption is partial:** `lib/adminUi.ts` helpers exist but many pages inline their own classes; `dashboard`, `login`, `pin` don't fully use the kit.

Chosen approach: **build the missing shared primitives, reconcile the token/class layer into one canonical set, then sweep every page onto it.** This is the only approach that permanently prevents drift — there becomes one source of truth, so new work stays consistent for free.

## Non-goals

- No dark mode (explicitly deferred — "Polish current look").
- No new navigation model or page-structure redesign.
- No changes to data fetching, mutations, validation, or any runtime behavior.
- No unrelated refactors beyond what the consistency pass touches.

## Design tokens (`app/globals.css` + `lib/adminUi.ts`)

Everything references these; nothing is arbitrary anymore.

### Type scale
Replaces the ad-hoc `text-[Npx]` literals. Keeps the dense admin feel. Defined as reusable values; applied via a small set of canonical classes.

| Token | px | Use |
|------|----|-----|
| `2xs` | 11 | micro labels, table-header caps, badge text |
| `xs`  | 12 | secondary/meta text |
| `sm`  | 13 | **default** body text and form controls |
| `base`| 14 | emphasized body, card titles-small |
| `lg`  | 16 | card/section titles |
| `xl`  | 20 | subsection headers |
| `2xl` | 24 | large headers |
| page title | 28→32 | existing `pageTitleClassName` (kept) |
| stat number | 28–30 | `AdminStatCard` value |

Migration: existing literals map to the nearest token (`text-[13px]`→`sm`, `text-[12px]`→`xs`, `text-[11px]`→`2xs`, `text-[10px]`→`2xs`, `text-[14px]`→`base`, `text-[16px]`→`lg`). The `text-[26px]` stat value → the stat-number size.

### Radius (two box radii + pill)
- **Interactive controls** (buttons, inputs, selects, tabs, small chips): `rounded-lg`.
- **Cards / panels / dropdowns**: `rounded-xl`.
- **Pills / avatars / status badges / progress bars**: `rounded-full`.
- Remove `rounded-md` / `rounded-sm` usage. This is the single biggest visible consistency fix.

### Shadow
- `shadow-sm` — resting cards/panels (subtle).
- `shadow-md` — dropdowns, popovers, mobile drawer.
- One brand-button shadow (the tasteful lift already in `AdminCard`'s action button) applied consistently to the primary `Button`.
- Subtle only — this is polish, not a bold redesign.

### Focus & spacing
- Keep the existing brand focus-visible ring (`globals.css`) — already good; ensure all new primitives inherit it.
- Standardize: card padding `p-5` (header `px-5 py-4`), page section gap `space-y-6`, form field gap.

## Primitive components (new `app/components/ui/`)

The pieces currently copy-pasted with drift. Each is small, single-purpose, and typed.

### `Button`
- **Props:** `variant: "primary" | "secondary" | "ghost" | "danger"`, `size: "sm" | "md"`, `loading?`, `icon?`, plus native button/anchor props. Renders `<button>` or (with `href`) a Next `<Link>`.
- **Style:** one radius (`rounded-lg`), one font weight, consistent padding per size, disabled + loading states. Primary carries the brand shadow.
- **Replaces:** every inline `bg-brand …` button, `adminPrimaryButtonClass`, `adminGhostButtonClass`, `adminDeleteConfirmButtonClass`, and `AdminCard`'s private `actionButtonClass`. Delete-style buttons become `variant="danger"` (`sm` and `md`).

### `Field` + `Input` + `Textarea`
- **`Field`:** wraps `label` (canonical uppercase micro-label), optional `hint`, and `error` text; associates `htmlFor`/`id`.
- **`Input` / `Textarea`:** one shared control style — surface bg, `border-border`, `rounded-lg`, `text-sm`, focus ring; `error` state swaps to `border-danger`. Reconciles `adminInputClass` (drop its `rounded-md`).
- **`AdminSelect`:** kept as-is functionally; restyled to match (control `rounded-lg`, dropdown panel `rounded-xl shadow-md`). Its current `rounded-md` panel and `text-[13px]` options align to tokens.

### `Badge`
- Wraps existing `adminBadgeClass` tones (`success | warning | danger | brand | muted`) as a component so statuses (users, payments, transcode) are declared once, not re-inlined.

### `FormSection`
- A titled, described group + responsive grid (1-col mobile, 2-col ≥md). Turns the big `MovieEditForm` (~545 lines) and `SeriesEditForm` (~419) from a wall of inputs into scannable groups. Structural only — same fields, same handlers.

## Reconcile the existing kit

Re-point these at the tokens above (mostly radius + type-class swaps, no API changes):

- `lib/adminUi.ts` — canonical home for class strings. Fix radius on `adminInputClass`, `adminPrimaryButtonClass`, `adminGhostButtonClass`, `adminDelete*`, `adminTab*`, `adminPaginationPageClass`, `adminBadgeBase`; normalize the `text-[Npx]` literals to the type classes. Button strings become thin aliases of the `Button` component's classes (or are removed as pages migrate).
- `AdminCard` — remove its private `actionButtonClass`; `headerAction` uses `Button`. Keep `rounded-xl`.
- `AdminStatCard` — `rounded-lg`→`rounded-xl`, stat-number token, consistent with `AdminCard`.
- `AdminTable` (`adminUi.ts` strings) — comfortable, consistent row padding; quiet uppercase header; **row hover**; right-aligned `tabular-nums` for numeric/amount columns (addresses "dense / hard to scan").
- `AdminEmptyState`, `AdminErrorAlert`, `AdminPagination`, `AdminSectionTabs`, `InlineLoading` — token alignment (radius/type), no behavior change.

## Page sweep

Apply primitives + reconciled kit to every page. No behavior changes.

- **Outliers into the system:** `login`, `pin`, `dashboard` (`app/page.tsx`) fully adopt `Button`/`Field`/`Card`/stat cards.
- **Content — Movies & Series:** `MovieEditForm`, `SeriesEditForm` rebuilt with `FormSection` grouping + `Field`/`Input`/`Textarea`; `MovieManagementTable`, `SeriesManagementTable`, `SeasonsEpisodesEditor` onto the table + `Button` standards.
- **Dashboard & data:** `revenue`, `payments`, `users`, `transcode`, `reports` — consistent stat cards, `Badge` statuses, scannable tables.
- **Home page & Plans:** `HeroFeaturedManager`, `PromotionBannerManager`, `FreeTodayManager`, `SubscriptionPlanCreator`, `HeroSlideMediaFields` onto `Button`/`Field`/`Card`.

## Consistency rules (the "law", to prevent re-drift)

1. Primary actions → `<Button variant="primary">`; destructive → `variant="danger"`; secondary/cancel → `secondary`/`ghost`. **No inline button classes.**
2. Every form control → `<Field><Input/></Field>` (or `AdminSelect`). No bare styled `<input>`.
3. Body/control text → `sm`; secondary → `xs`; micro-labels/table caps → `2xs`. No `text-[Npx]` literals.
4. Controls → `rounded-lg`; cards/panels/dropdowns → `rounded-xl`; pills → `rounded-full`. No `rounded-md`/`sm`.
5. Statuses → `<Badge tone=…>`.
6. Grouped forms → `<FormSection>`.

## Testing / verification

Visual + structural change, so verification is by **driving the app**, not unit tests:

- `next build` + `eslint` pass (no type/lint regressions).
- Run the app (`/run` skill) and visually confirm each page group renders and its primary flows (open a form, a table, a dropdown, the mobile nav) still work.
- Spot-check: no remaining `rounded-md` on controls, no inline `bg-brand` buttons, no `text-[Npx]` literals in swept files.
- Confirm no diffs to `app/api/**`, `lib/api.ts`, hooks, or any data/mutation logic.

## Risks & mitigations

- **Large surface area.** Mitigate by doing foundation first (tokens + primitives), then sweeping page-group by page-group, building between groups.
- **Accidental behavior change during refactor.** Mitigate by treating handlers/state as untouchable — only markup/className/structure changes; verify each group in the running app.
- **Missed pages.** The page-sweep list above is the checklist; grep for the anti-patterns (rule violations) at the end.
