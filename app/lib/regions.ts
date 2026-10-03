export type RegionOption = { value: string; label: string };

/** Values are the region codes stored in content.region — the client nav filters on them. */
export const REGION_OPTIONS: RegionOption[] = [
  { value: "US", label: "US" },
  { value: "Hindi", label: "India" },
  { value: "INDO", label: "Indonesia" },
  { value: "CH", label: "China" },
  { value: "KR", label: "Korea" },
];

export function regionLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return REGION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
