export type RegionOption = { value: string; label: string };

export const REGION_OPTIONS: RegionOption[] = [
  { value: "us", label: "US" },
  { value: "india", label: "India" },
  { value: "indo", label: "Indonesia" },
  { value: "china", label: "China" },
  { value: "korea", label: "Korea" },
];

export function regionLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return REGION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
