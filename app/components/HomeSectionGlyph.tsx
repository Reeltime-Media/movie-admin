import type { SectionGlyphKind } from "../lib/homeSections";

const SHAPES: Record<SectionGlyphKind, [x: number, y: number, w: number, h: number][]> = {
  hero: [[0, 0, 44, 28]],
  banner: [[0, 7, 44, 14]],
  posters: [
    [0, 6, 9.5, 16],
    [11.5, 6, 9.5, 16],
    [23, 6, 9.5, 16],
    [34.5, 6, 9.5, 16],
  ],
  wide: [
    [0, 8, 19, 12],
    [21, 8, 19, 12],
    [42, 8, 2, 12],
  ],
  channels: [
    [0, 9, 13, 10],
    [15.5, 9, 13, 10],
    [31, 9, 13, 10],
  ],
  plans: [
    [0, 5, 13, 18],
    [15.5, 5, 13, 18],
    [31, 5, 13, 18],
  ],
};

/** Tiny wireframe of how a section sits on the website. */
export function HomeSectionGlyph({
  kind,
  className = "",
}: {
  kind: SectionGlyphKind;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 44 28"
      className={`h-7 w-11 shrink-0 fill-current ${className}`}
      aria-hidden
    >
      {SHAPES[kind].map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={1.5} />
      ))}
    </svg>
  );
}
