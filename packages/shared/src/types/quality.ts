export const STANDARD_QUALITY_LEVELS = [
  "common",
  "excellent",
  "rare",
  "epic",
  "legendary",
] as const;

export type StandardQuality = (typeof STANDARD_QUALITY_LEVELS)[number];

export const RESERVED_QUALITY_LEVELS = ["mythic"] as const;

export type ReservedQuality = (typeof RESERVED_QUALITY_LEVELS)[number];

export const QUALITY_LEVELS = [...STANDARD_QUALITY_LEVELS, ...RESERVED_QUALITY_LEVELS] as const;

export type Quality = StandardQuality | ReservedQuality;

export const QUALITY_COLORS = {
  common: "#9CA3AF",
  excellent: "#22C55E",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F97316",
} as const satisfies Readonly<Record<StandardQuality, string>>;

export function isQuality(value: unknown): value is Quality {
  return typeof value === "string" && QUALITY_LEVELS.some((quality) => quality === value);
}

export function isStandardQuality(value: unknown): value is StandardQuality {
  return typeof value === "string" && STANDARD_QUALITY_LEVELS.some((quality) => quality === value);
}

export function isReservedQuality(value: unknown): value is ReservedQuality {
  return typeof value === "string" && RESERVED_QUALITY_LEVELS.some((quality) => quality === value);
}
