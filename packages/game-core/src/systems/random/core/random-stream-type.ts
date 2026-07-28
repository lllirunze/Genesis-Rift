export const RANDOM_STREAM_TYPES = [
  "map",
  "combat",
  "loot",
  "event",
  "weather",
  "npc",
  "quest",
  "mission",
  "deck",
  "reincarnation",
  "contract",
] as const;

export type RandomStreamType = (typeof RANDOM_STREAM_TYPES)[number];

export function isRandomStreamType(value: string): value is RandomStreamType {
  return RANDOM_STREAM_TYPES.some((streamType) => streamType === value);
}
