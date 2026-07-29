export const QUALITY_LEVELS = ["common", "excellent", "rare", "epic", "legendary"] as const;

export type Quality = (typeof QUALITY_LEVELS)[number];

export const QUALITY_COLORS = {
  common: "#9CA3AF",
  excellent: "#22C55E",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F97316",
} as const satisfies Readonly<Record<Quality, string>>;

export function isQuality(value: unknown): value is Quality {
  return typeof value === "string" && QUALITY_LEVELS.some((quality) => quality === value);
}
