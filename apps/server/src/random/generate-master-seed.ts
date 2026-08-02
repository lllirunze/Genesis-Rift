import { randomBytes } from "node:crypto";

import { createMasterSeed, MASTER_SEED_BYTES, type MasterSeed } from "@genesis-rift/game-core";

/**
 * 方法名：generateMasterSeed
 * 作用：执行该方法负责的单一业务操作。
 * @returns 本次处理得到的结果。
 */
export function generateMasterSeed(): MasterSeed {
  return createMasterSeed(randomBytes(MASTER_SEED_BYTES).toString("hex"));
}
