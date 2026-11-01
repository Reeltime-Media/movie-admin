export const PIN_COOKIE = "reeltime_admin_pin";

const PIN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

export function getAdminPin() {
  // Prefer the server-only ADMIN_PIN. NEXT_PUBLIC_ADMIN_PIN is kept only as a
  // fallback for existing deploys, but note that any NEXT_PUBLIC_* var is inlined
  // into the client bundle — set ADMIN_PIN (server-only) instead.
  // The "1234" default is dev-only: in production a missing PIN fails closed
  // rather than accepting a well-known default.
  const configured = process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN;
  const raw = configured ?? (process.env.NODE_ENV === "production" ? "" : "1234");
  return raw.trim();
}

/** Keyed by the PIN, so a cookie can't be forged and changing the PIN ends every session. */
async function sign(expiresAt: string, pin: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`reeltime-admin-pin:${pin}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(expiresAt));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

export async function createPinCookie(pin: string) {
  const expiresAt = String(Date.now() + PIN_COOKIE_MAX_AGE_SECONDS * 1000);
  return {
    value: `${expiresAt}.${await sign(expiresAt, pin)}`,
    maxAge: PIN_COOKIE_MAX_AGE_SECONDS,
  };
}

export async function isValidPinCookie(value: string | undefined) {
  const pin = getAdminPin();
  if (!pin || !value) return false;
  const [expiresAt, signature, ...rest] = value.split(".");
  if (!expiresAt || !signature || rest.length > 0) return false;
  if (!(Number(expiresAt) > Date.now())) return false;
  return safeEqual(signature, await sign(expiresAt, pin));
}
