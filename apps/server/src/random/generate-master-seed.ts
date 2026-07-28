import { randomBytes } from "node:crypto";

import { createMasterSeed, MASTER_SEED_BYTES, type MasterSeed } from "@genesis-rift/game-core";

export function generateMasterSeed(): MasterSeed {
  return createMasterSeed(randomBytes(MASTER_SEED_BYTES).toString("hex"));
}
