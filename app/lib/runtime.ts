export function runtimeMinutesFromApi(content: {
  duration_seconds?: number | null;
  runtime?: string | null;
}): number | null {
  if (content.duration_seconds != null && content.duration_seconds > 0) {
    return Math.round(content.duration_seconds / 60);
  }
  const raw = content.runtime?.trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return null;
}

export function parseRuntimeMinutesInput(value: FormDataEntryValue | string | null | undefined):
  | { ok: true; value: number | undefined }
  | { ok: false; message: string } {
  const raw = String(value ?? "").trim();
  if (!raw) return { ok: true, value: undefined };
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { ok: false, message: "Runtime must be a positive number (minutes)." };
  }
  return { ok: true, value: Math.round(parsed) };
}
