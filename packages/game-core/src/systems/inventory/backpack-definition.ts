import { BACKPACK_LEVELS, BACKPACK_USABLE_AREAS } from "./backpack-config.ts";

export type BackpackLevel = (typeof BACKPACK_LEVELS)[number];

export interface BackpackUsableArea {
  readonly width: number;
  readonly height: number;
}

export function getBackpackUsableArea(level: BackpackLevel): BackpackUsableArea {
  return BACKPACK_USABLE_AREAS[level];
}

export function isBackpackLevel(value: unknown): value is BackpackLevel {
  return typeof value === "number" && BACKPACK_LEVELS.some((level) => level === value);
}
