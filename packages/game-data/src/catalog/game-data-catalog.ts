import type { HandCardId } from "@genesis-rift/game-core";
import type { ConfigId } from "@genesis-rift/shared";

export interface GameDataEntry {
  readonly id: ConfigId;
  readonly name: string;
}

export interface HandCardDataEntry {
  readonly cardId: HandCardId;
  readonly name: string;
}

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
