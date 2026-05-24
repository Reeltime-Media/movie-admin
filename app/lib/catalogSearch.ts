import type { CatalogEntry } from "./adminData";

/** Client-side filter for admin movie/series catalog tables. */
export function matchesCatalogSearch(entry: CatalogEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const parts = [
    entry.title,
    entry.slug,
    entry.description,
    entry.genre,
    entry.owner,
    entry.status,
    entry.type,
    entry.price,
    entry.rating,
    entry.runtime,
    entry.releaseYear != null ? String(entry.releaseYear) : "",
  ];

  for (const season of entry.seasons) {
    parts.push(`season ${season.number}`, season.title);
    for (const ep of season.episodes) {
      parts.push(ep.title, ep.slug, ep.runtime);
      if (ep.number != null) parts.push(String(ep.number));
    }
  }

  return parts.join(" ").toLowerCase().includes(q);
}
