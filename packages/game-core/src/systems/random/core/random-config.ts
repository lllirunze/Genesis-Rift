/** 相互独立且均由主种子派生的业务随机流类型。 */
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

/** 存档与回放用于确认随机算法兼容性的版本标识。 */
export const RANDOM_ALGORITHM_ID = "splitmix64-v1" as const;
/** 安全主随机种子占用的字节数。 */
export const MASTER_SEED_BYTES = 32;
/** 主随机种子转换为十六进制字符串后的固定长度。 */
export const MASTER_SEED_HEX_LENGTH = MASTER_SEED_BYTES * 2;
/** 单个业务随机流使用的十六进制种子长度。 */
export const RANDOM_STREAM_SEED_HEX_LENGTH = 16;
/** 整数随机接口支持的最大半开区间长度。 */
export const MAX_RANDOM_INTEGER_RANGE = 0x1_0000_0000;
