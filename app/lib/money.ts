export const MIN_PAID_PRICE_USD = 0.03;

export function formatUsdDisplay(value: string | number): string {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return "0.00";
  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const ADMIN_PRICE_HINT =
  "Enter 0 for free, or at least $0.03 for paid pricing.";

export function normalizeMoneyInput(value: string): string | null {
  const normalized = value.replace(/[$,\s]/g, "").trim();
  if (!normalized) return null;
  return /^\d+(\.\d+)?$/.test(normalized) ? normalized : null;
}

function parseUsdToCents(normalized: string): number | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) return null;
  const whole = Number.parseInt(match[1], 10);
  const frac = (match[2] ?? "").padEnd(2, "0").slice(0, 2);
  const fracCents = Number.parseInt(frac, 10);
  if (!Number.isFinite(whole) || !Number.isFinite(fracCents)) return null;
  return whole * 100 + fracCents;
}

function centsToApiValue(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const rem = cents % 100;
  if (rem === 0) return String(dollars);
  return `${dollars}.${String(rem).padStart(2, "0")}`;
}

export function validateAdminPriceUsd(
  value: string,
): { ok: true; value: string } | { ok: false; message: string } {
  if (/^free$/i.test(value.trim())) {
    return { ok: true, value: "0" };
  }

  const normalized = normalizeMoneyInput(value);
  if (!normalized) {
    return {
      ok: false,
      message: "Enter a valid price. Use 0 for free, or at least $0.03.",
    };
  }

  const cents = parseUsdToCents(normalized);
  if (cents === null || cents < 0) {
    return {
      ok: false,
      message: "Enter a valid price. Use 0 for free, or at least $0.03.",
    };
  }
  if (cents === 0) {
    return { ok: true, value: "0" };
  }
  if (cents >= Math.round(MIN_PAID_PRICE_USD * 100)) {
    return { ok: true, value: centsToApiValue(cents) };
  }

  return {
    ok: false,
    message: "Price must be $0 (free) or at least $0.03. Amounts between $0.01 and $0.02 are not allowed.",
  };
}

export function moneyToApi(value: string): string | null {
  const result = validateAdminPriceUsd(value);
  return result.ok ? result.value : null;
}
