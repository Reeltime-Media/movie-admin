---
name: verify
description: Build, run, and drive the movie-admin Next.js app to verify a change at its real surface.
---

# Verifying movie-admin

Next.js 16 (Turbopack) + React 19 + Tailwind v4 admin console.

## Launch

```bash
npx next dev -p 4137 > /tmp/dev.log 2>&1 &
sleep 8   # "✓ Ready" lands in ~400ms, but give Turbopack margin
```

Pick a non-default port — 3000 is often taken by the sibling `movie-client`.

## Get past the auth gates (two of them)

Every admin route is gated twice: a **PIN cookie** (middleware) then an **admin token** (client-side in `AdminShell`).

1. **PIN** — `ADMIN_PIN` is empty in `.env`, so dev falls back to `1234`
   (see `app/api/pin/verify/route.ts`; it fails closed in production).

```bash
curl -s -X POST http://localhost:4137/api/pin/verify \
  -H 'Content-Type: application/json' -d '{"pin":"1234"}' -c /tmp/cookies.txt
# -> {"ok":true}
```

Then pass `-b /tmp/cookies.txt` on every request. Without it `/login` 307s to `/pin`.

2. **Admin token** — `AdminShell` redirects to `/login` client-side when there's no
   token, but pages still **server-render fully**. So for verifying markup/CSS you
   do not need to log in: `curl -b cookies.txt` returns the real SSR'd DOM.

## Drive it

No browser driver is installed (no Playwright/Puppeteer). Don't add one without
asking — it's a heavy dep on the user's project. Two surfaces you *can* reach:

**Rendered DOM** — real evidence for markup/props/attributes:

```bash
curl -s -b /tmp/cookies.txt http://localhost:4137/series/new \
  | grep -oE '<button[^>]*name="intent"[^>]*>'
```

**Compiled CSS** — the only way to prove Tailwind actually generated a utility.
Custom `@theme` keys (`text-2xs`, `text-stat`) silently no-op if the scanner
misses them, and dev looks fine while prod is purged. Check *both*:

```bash
# dev
CSS=$(curl -s http://localhost:4137/pin | grep -oE '/_next/static/[^"]*\.css' | head -1)
curl -s "http://localhost:4137$CSS" | grep -A2 '\.text-2xs {'
# production (after `npm run build`)
grep -oE '\.text-2xs\{[^}]*\}' $(find .next/static -name '*.css' | head -1)
```

Route sweep for render regressions:

```bash
for r in / /movie /movie/new /series /series/new /users /payments /revenue \
         /plans /promotions /transcode /reports /login /forgot-password; do
  printf '%-18s %s\n' "$r" "$(curl -s -o /dev/null -w '%{http_code}' -b /tmp/cookies.txt "http://localhost:4137$r")"
done
```

All should be 200. `/pin` returns 307 once you hold the PIN cookie — that's correct.

Check `/tmp/dev.log` for runtime errors after driving.

## Gotchas

- `npm run lint` has **2 pre-existing errors** (`react-hooks/set-state-in-effect`
  in `AdminContentHlsPlayer.tsx` / `AdminSourceVideoPlayer.tsx`) on `main`. Don't
  attribute them to your change; confirm against the base commit before chasing.
- Next 16 logs a deprecation: the `middleware` convention should become `proxy`.
  Pre-existing, harmless, unrelated to most changes.
- Forms here read `FormData` by `name` (login, movie/new, series/new). `series/new`
  distinguishes draft-vs-upload via `name="intent"` + `value` on the **submit
  button** — if you touch buttons, verify those attrs still reach the DOM.
