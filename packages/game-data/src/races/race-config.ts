import type { PrimaryAttribute, PrimaryAttributes } from "../attributes/primary-attributes.ts";

export const RACE_NAMES = ["human", "divine", "demon", "yokai"] as const;

export type RaceName = (typeof RACE_NAMES)[number];
export type RaceConfigId = `race.${RaceName}`;
export type RaceNameKey = `race.${RaceName}.name`;

export interface RaceAttributeTendencies {
  readonly increased: readonly PrimaryAttribute[];
  readonly decreased: readonly PrimaryAttribute[];
}

export interface RaceConfig {
  readonly id: RaceConfigId;
  readonly name: RaceName;
  readonly nameKey: RaceNameKey;
  readonly attributeTendencies: RaceAttributeTendencies;
  readonly initialPrimaryAttributeOffset: PrimaryAttributes;
}
