import type { PrimaryAttribute, PrimaryAttributes } from "../attributes/primary-attributes.ts";
import { RACE_NAMES } from "./race-name-config.ts";

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
