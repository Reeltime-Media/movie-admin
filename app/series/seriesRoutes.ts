import type { AppName } from "../lib/api";

/** Where a series screen links to: TV5, short series and series each have their own list. */
export function seriesRoutes(app: AppName, isShort: boolean) {
  if (app === "tv5") {
    return {
      list: "/tv5/series",
      create: "/tv5/series/new",
      detail: (id: string) => `/tv5/series/${id}`,
      edit: (id: string) => `/tv5/series/${id}/edit`,
      noun: "TV5 series",
      catalogPath: "the TV5 app",
    };
  }
  const list = isShort ? "/short-series" : "/series";
  return {
    list,
    create: `${list}/new`,
    detail: (id: string) => `/series/${id}`,
    edit: (id: string) => `/series/${id}/edit`,
    noun: isShort ? "short series" : "series",
    catalogPath: isShort ? "/short-movies" : "/series",
  };
}
