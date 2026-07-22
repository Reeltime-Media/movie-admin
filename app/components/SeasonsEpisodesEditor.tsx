"use client";

import type { Episode, Season } from "../lib/adminData";
import { Button } from "./ui/Button";
import { newEpisodeId, newSeasonId, renumberSeasons } from "../lib/seriesHelpers";

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-white focus:border-border-hover focus:bg-surface-elevated";

type SeasonsEpisodesEditorProps = {
  seasons: Season[];
  onChange: (next: Season[]) => void;
};

export function SeasonsEpisodesEditor({ seasons, onChange }: SeasonsEpisodesEditorProps) {
  const emit = (next: Season[]) => onChange(renumberSeasons(next));

  const updateSeason = (seasonId: string, patch: Partial<Pick<Season, "title">>) => {
    emit(seasons.map((s) => (s.id === seasonId ? { ...s, ...patch } : s)));
  };

  const updateEpisode = (seasonId: string, episodeId: string, patch: Partial<Episode>) => {
    emit(
      seasons.map((s) => {
        if (s.id !== seasonId) return s;
        return {
          ...s,
          episodes: s.episodes.map((e) => (e.id === episodeId ? { ...e, ...patch } : e)),
        };
      }),
    );
  };

  const addSeason = () => {
    emit([
      ...seasons,
      {
        id: newSeasonId(),
        number: seasons.length + 1,
        title: `Season ${seasons.length + 1}`,
        episodes: [
          {
            id: newEpisodeId(),
            number: 1,
            title: "Episode 1",
            runtime: "",
          },
        ],
      },
    ]);
  };

  const removeSeason = (seasonId: string) => {
    if (seasons.length <= 1) return;
    emit(seasons.filter((s) => s.id !== seasonId));
  };

  const addEpisode = (seasonId: string) => {
    emit(
      seasons.map((s) => {
        if (s.id !== seasonId) return s;
        const n = s.episodes.length + 1;
        return {
          ...s,
          episodes: [
            ...s.episodes,
            {
              id: newEpisodeId(),
              number: n,
              title: `Episode ${n}`,
              runtime: "",
            },
          ],
        };
      }),
    );
  };

  const removeEpisode = (seasonId: string, episodeId: string) => {
    emit(
      seasons.map((s) => {
        if (s.id !== seasonId) return s;
        if (s.episodes.length <= 1) return s;
        return { ...s, episodes: s.episodes.filter((e) => e.id !== episodeId) };
      }),
    );
  };

  return (
    <div className="space-y-5">
      {seasons.map((season) => (
        <div
          key={season.id}
          className="rounded-lg border border-border bg-bg p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
            <div className="grid min-w-[200px] flex-1 gap-2 sm:max-w-xs">
              <label className="block">
                <span className="mb-1 block text-2xs font-semibold text-text-disabled">
                  Season label
                </span>
                <input
                  className={inputClass}
                  value={season.title}
                  onChange={(e) => updateSeason(season.id, { title: e.target.value })}
                  placeholder="Season 1"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => addEpisode(season.id)}>
                Add episode
              </Button>
              <Button
                type="button"
                variant="danger-soft"
                size="sm"
                onClick={() => removeSeason(season.id)}
                disabled={seasons.length <= 1}
              >
                Remove season
              </Button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="hidden text-2xs font-bold uppercase tracking-widest text-text-disabled sm:grid sm:grid-cols-[52px_minmax(0,1fr)_100px_72px_80px] sm:gap-2 sm:px-1">
              <span>Ep</span>
              <span>Title</span>
              <span>Runtime</span>
              <span>Free</span>
              <span className="text-right"> </span>
            </div>
            {season.episodes.map((ep) => (
              <div
                key={ep.id}
                className="flex flex-col gap-2 rounded-lg border border-dashed border-border/80 bg-surface/50 p-3 sm:grid sm:grid-cols-[52px_minmax(0,1fr)_100px_72px_80px] sm:items-center sm:gap-2 sm:border-0 sm:bg-transparent sm:p-1"
              >
                <div className="text-xs font-bold text-text-muted">E{ep.number}</div>
                <input
                  className={inputClass}
                  value={ep.title}
                  onChange={(e) => updateEpisode(season.id, ep.id, { title: e.target.value })}
                  placeholder="Episode title"
                />
                <input
                  className={inputClass}
                  value={ep.runtime}
                  onChange={(e) => updateEpisode(season.id, ep.id, { runtime: e.target.value })}
                  placeholder="45m"
                />
                <label className="flex items-center justify-center gap-2 text-xs font-semibold text-text-muted sm:justify-start">
                  <input
                    type="checkbox"
                    checked={Boolean(ep.isFree)}
                    onChange={(e) =>
                      updateEpisode(season.id, ep.id, { isFree: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  Free
                </label>
                <div className="flex justify-end sm:block">
                  <Button
                    type="button"
                    variant="danger-soft"
                    size="sm"
                    onClick={() => removeEpisode(season.id, ep.id)}
                    disabled={season.episodes.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={addSeason}>
          Add season
        </Button>
      </div>
    </div>
  );
}
