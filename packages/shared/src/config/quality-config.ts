export const STANDARD_QUALITY_LEVELS = [
  "common",
  "excellent",
  "rare",
  "epic",
  "legendary",
] as const;

export const RESERVED_QUALITY_LEVELS = ["mythic"] as const;

export const QUALITY_LEVELS = [...STANDARD_QUALITY_LEVELS, ...RESERVED_QUALITY_LEVELS] as const;

export const QUALITY_COLORS = {
  common: "#9CA3AF",
  excellent: "#22C55E",
  rare: "#3B82F6",
  epic: "#A855F7",
  legendary: "#F97316",
} as const;
