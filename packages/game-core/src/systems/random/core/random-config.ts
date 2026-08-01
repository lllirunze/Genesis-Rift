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

export const RANDOM_ALGORITHM_ID = "splitmix64-v1" as const;
export const MASTER_SEED_BYTES = 32;
export const MASTER_SEED_HEX_LENGTH = MASTER_SEED_BYTES * 2;
export const RANDOM_STREAM_SEED_HEX_LENGTH = 16;
export const MAX_RANDOM_INTEGER_RANGE = 0x1_0000_0000;
