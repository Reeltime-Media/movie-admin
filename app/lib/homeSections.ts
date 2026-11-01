import type { ApiHomeSection, ApiHomeSectionType } from "./api";

export type SectionGlyphKind = "hero" | "banner" | "posters" | "wide" | "channels" | "plans";

type SectionTypeInfo = {
  label: string;
  /** What the section is, in the words of someone looking at the website. */
  description: string;
  /** Row summary for sections whose content is managed in their own editor. */
  contentLabel?: string;
  /** Mirrors how movie-client lays the section out. */
  glyph: SectionGlyphKind;
};

export const SECTION_TYPES: Record<ApiHomeSectionType, SectionTypeInfo> = {
  hero: {
    label: "Hero carousel",
    description: "Large rotating slides at the top of the page. Hidden on phones.",
    contentLabel: "Slides",
    glyph: "hero",
  },
  banners: {
    label: "Promo banners",
    description: "Wide promotions. Signed-in viewers see Continue watching right after this.",
    contentLabel: "Banners",
    glyph: "banner",
  },
  tv: { label: "Live TV", description: "A row of live channels.", glyph: "channels" },
  free_today: {
    label: "Free movies today",
    description: "Movies viewers can watch at no cost today.",
    glyph: "posters",
  },
  trending: { label: "Trending now", description: "A row of movie posters.", glyph: "posters" },
  most_watched: {
    label: "Most watched",
    description: "A row of wide movie cards that scrolls by itself.",
    glyph: "wide",
  },
  coming_soon: {
    label: "Coming soon",
    description: "Upcoming movies, marked as soon.",
    glyph: "posters",
  },
  series: { label: "Series", description: "A row of wide series cards.", glyph: "wide" },
  genre: {
    label: "Genre rail",
    description: "Movie posters from one genre, linked to that genre's page.",
    glyph: "posters",
  },
  custom: {
    label: "Custom rail",
    description: "A hand-picked row of movies and series with your own title.",
    glyph: "posters",
  },
  plans: {
    label: "Plans",
    description: "Subscription plan cards.",
    contentLabel: "Plan cards",
    glyph: "plans",
  },
};

export const ADDABLE_SECTION_TYPES: ApiHomeSectionType[] = [
  "genre",
  "custom",
  "trending",
  "most_watched",
  "series",
  "tv",
  "free_today",
  "coming_soon",
  "hero",
  "banners",
  "plans",
];

/** Only these can exist more than once, and only these can be deleted. */
const REPEATABLE_TYPES = new Set(["genre", "custom"]);

const ITEM_KINDS: Record<string, "movie" | "series" | "tv_channel"> = {
  tv: "tv_channel",
  series: "series",
  free_today: "movie",
  trending: "movie",
  most_watched: "movie",
  coming_soon: "movie",
  genre: "movie",
  custom: "movie",
};

/** movie-client's HomeSectionsFeed ignores the title on these. */
const UNTITLED_TYPES = new Set(["hero", "banners", "plans"]);

const FALLBACK_INFO: SectionTypeInfo = { label: "Section", description: "", glyph: "posters" };

export function sectionTypeInfo(type: string): SectionTypeInfo {
  return SECTION_TYPES[type as ApiHomeSectionType] ?? { ...FALLBACK_INFO, label: type };
}

export function sectionLabel(section: ApiHomeSection): string {
  if (section.title?.trim()) return section.title.trim();
  if (section.type === "genre" && section.genre_name) return section.genre_name;
  return sectionTypeInfo(section.type).label;
}

export function isRepeatableSection(type: string): boolean {
  return REPEATABLE_TYPES.has(type);
}

export function sectionShowsTitle(type: string): boolean {
  return !UNTITLED_TYPES.has(type);
}

export function sectionItemKind(type: string): "movie" | "series" | "tv_channel" | null {
  return ITEM_KINDS[type] ?? null;
}

export function sectionItemNoun(type: string, count = 2): string {
  if (type === "tv") return count === 1 ? "channel" : "channels";
  if (type === "series") return "series";
  return count === 1 ? "title" : "titles";
}

/** One-line state for the outline: what this section currently puts on the page. */
export function sectionSummary(section: ApiHomeSection): string {
  const { contentLabel } = sectionTypeInfo(section.type);
  if (contentLabel) return contentLabel;
  if (section.item_count > 0) {
    return `${section.item_count} ${sectionItemNoun(section.type, section.item_count)}`;
  }
  return section.auto_filled ? "Automatic" : "Empty, not on the page";
}
