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

/** Genres are managed in the API, so anything stored is kept, known to this list or not. */
export function parseGenresFromStored(stored: string): string[] {
  const known = new Set<string>(GENRE_OPTIONS);
  const out = new Set<string>();

  for (const part of stored.split(",").map((p) => p.trim()).filter(Boolean)) {
    // Older rows separated genres with spaces: "Action Drama".
    const words = part.split(/\s+/);
    if (!known.has(part) && words.length > 1 && words.every((word) => known.has(word))) {
      words.forEach((word) => out.add(word));
    } else {
      out.add(part);
    }
  }

  return [...out];
}
