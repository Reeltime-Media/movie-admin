import type { CatalogEntry, Episode, Season } from "./adminData";

export function newSeasonId() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newEpisodeId() {
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultSeasons(): Season[] {
  return [
    {
      id: newSeasonId(),
      number: 1,
      title: "Season 1",
      episodes: [
        {
          id: newEpisodeId(),
          number: 1,
          title: "Episode 1",
          runtime: "",
        },
      ],
    },
  ];
}

export function renumberSeasons(seasons: Season[]): Season[] {
  return seasons.map((season, si) => ({
    ...season,
    number: si + 1,
    episodes: season.episodes.map((ep, ei) => ({
      ...ep,
      number: ei + 1,
    })),
  }));
}

export function totalEpisodesInEntry(entry: CatalogEntry): number {
  return entry.seasons.reduce((acc, s) => acc + s.episodes.length, 0);
}

export function seriesStructureSummary(entry: CatalogEntry): string {
  if (entry.type !== "Series") return "—";
  const ep = totalEpisodesInEntry(entry);
  const sn = entry.seasons.length;
  if (sn === 0 && ep === 0) return "No seasons";
  return `${sn} season${sn === 1 ? "" : "s"}, ${ep} episode${ep === 1 ? "" : "s"}`;
}


export function validateSeriesSeasons(seasons: Season[]): boolean {
  if (seasons.length === 0) return false;
  return seasons.every(
    (s) => s.episodes.length > 0 && s.episodes.every((e) => e.title.trim().length > 0),
  );
}

export function episodesAllHaveVideo(seasons: Season[]): boolean {
  return seasons.every((s) =>
    s.episodes.every((e) => Boolean(e.videoFileName?.trim())),
  );
}
