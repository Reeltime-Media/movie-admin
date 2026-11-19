import type { ApiContent, ApiMatchDetails } from "../../lib/api";

export const WINNER_LABELS: Record<NonNullable<ApiMatchDetails["winner"]>, string> = {
  red: "Red corner won",
  blue: "Blue corner won",
  draw: "Draw",
  no_contest: "No contest",
};

/** "Moeun Sokhuch vs Ahmad Masouminia" — the default title for a match. */
export function matchup(match: Pick<ApiMatchDetails, "red_fighter" | "blue_fighter">) {
  const red = match.red_fighter.trim();
  const blue = match.blue_fighter.trim();
  return red && blue ? `${red} vs ${blue}` : "";
}

export function formatMatchDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** "KO, round 3 · Red corner won" */
export function matchResult(match: ApiMatchDetails) {
  if (!match.winner) return null;
  const how = [match.result_method, match.result_round ? `round ${match.result_round}` : null]
    .filter(Boolean)
    .join(", ");
  return how ? `${WINNER_LABELS[match.winner]} · ${how}` : WINNER_LABELS[match.winner];
}

export function matchSearchText(item: ApiContent) {
  const m = item.match;
  return [item.title, m?.red_fighter, m?.blue_fighter, m?.event_name, m?.weight_class]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
