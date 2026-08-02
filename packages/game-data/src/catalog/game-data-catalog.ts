import type { HandCardId } from "@genesis-rift/game-core";
import type { ConfigId } from "@genesis-rift/shared";

/** 描述当前模块对外公开的业务数据契约。 */
export interface GameDataEntry {
  readonly id: ConfigId;
  readonly name: string;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface HandCardDataEntry {
  readonly cardId: HandCardId;
  readonly name: string;
}

/** 描述以标识索引业务定义的只读注册表。 */
export interface GameDataCatalog {
  readonly items: readonly GameDataEntry[];
  readonly races: readonly GameDataEntry[];
  readonly identities: readonly GameDataEntry[];
  readonly equipment: readonly GameDataEntry[];
  readonly handCards: readonly HandCardDataEntry[];
  readonly events: readonly GameDataEntry[];
  readonly missions: readonly GameDataEntry[];
  readonly maps: readonly GameDataEntry[];
  readonly statuses: readonly GameDataEntry[];
}
