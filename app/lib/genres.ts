export const GENRE_OPTIONS = [
  "Action",
  "Adventure",
  "Animation",
  "Biography",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Sport",
  "Thriller",
  "War",
  "Western",
] as const;

export type GenreOption = (typeof GENRE_OPTIONS)[number];

export function formatGenres(selected: string[]): string {
  return selected.filter(Boolean).join(", ");
}

export function parseGenresFromStored(stored: string): string[] {
  const allowed = new Set<string>(GENRE_OPTIONS);
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (g: string) => {
    if (!allowed.has(g) || seen.has(g)) return;
    seen.add(g);
    out.push(g);
  };

  for (const part of stored.split(",").map((p) => p.trim()).filter(Boolean)) {
    if (allowed.has(part)) {
      push(part);
      continue;
    }
    for (const word of part.split(/\s+/)) {
      if (allowed.has(word)) push(word);
    }
  }

  return out;
}
