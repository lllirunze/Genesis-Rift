import {
  QUALITY_LEVELS,
  RESERVED_QUALITY_LEVELS,
  STANDARD_QUALITY_LEVELS,
} from "../config/quality-config.ts";

export type StandardQuality = (typeof STANDARD_QUALITY_LEVELS)[number];
export type ReservedQuality = (typeof RESERVED_QUALITY_LEVELS)[number];
export type Quality = (typeof QUALITY_LEVELS)[number];

export function isQuality(value: unknown): value is Quality {
  return typeof value === "string" && QUALITY_LEVELS.some((quality) => quality === value);
}

export function isStandardQuality(value: unknown): value is StandardQuality {
  return typeof value === "string" && STANDARD_QUALITY_LEVELS.some((quality) => quality === value);
}

export function isReservedQuality(value: unknown): value is ReservedQuality {
  return typeof value === "string" && RESERVED_QUALITY_LEVELS.some((quality) => quality === value);
}
