import type { ConfigId } from "@genesis-rift/shared";

export interface GameDataEntry {
  readonly id: ConfigId;
  readonly name: string;
}

export interface GameDataCatalog {
  readonly items: readonly GameDataEntry[];
  readonly races: readonly GameDataEntry[];
  readonly identities: readonly GameDataEntry[];
  readonly equipment: readonly GameDataEntry[];
  readonly strategyCards: readonly GameDataEntry[];
  readonly events: readonly GameDataEntry[];
  readonly missions: readonly GameDataEntry[];
  readonly maps: readonly GameDataEntry[];
}
