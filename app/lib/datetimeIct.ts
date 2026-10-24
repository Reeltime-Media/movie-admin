/** Cambodia time (ICT, UTC+7) helpers for admin schedule fields. */

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** ISO UTC → `datetime-local` value in ICT. */
export function toIctDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const ict = new Date(date.getTime() + ICT_OFFSET_MS);
  return `${ict.getUTCFullYear()}-${pad(ict.getUTCMonth() + 1)}-${pad(ict.getUTCDate())}T${pad(ict.getUTCHours())}:${pad(ict.getUTCMinutes())}`;
}

/** `datetime-local` (interpreted as ICT) → ISO UTC string, or null if empty/invalid. */
export function fromIctDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const utcMs = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
  ) - ICT_OFFSET_MS;
  const date = new Date(utcMs);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Human label e.g. "23 Oct 2026, 20:00 ICT". */
export function formatIctLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const ict = new Date(date.getTime() + ICT_OFFSET_MS);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${ict.getUTCDate()} ${months[ict.getUTCMonth()]} ${ict.getUTCFullYear()}, ${pad(ict.getUTCHours())}:${pad(ict.getUTCMinutes())} ICT`;
}
