import type { PrimaryAttribute, PrimaryAttributes } from "../attributes/primary-attributes.ts";
import { RACE_NAMES } from "./race-name-config.ts";

/** 当前版本支持的角色种族名称。 */
export type RaceName = (typeof RACE_NAMES)[number];
/** 种族配置的全局标识格式。 */
export type RaceConfigId = `race.${RaceName}`;
/** 种族本地化名称使用的资源键格式。 */
export type RaceNameKey = `race.${RaceName}.name`;

/** 种族对基础属性产生的正向与负向倾向。 */
export interface RaceAttributeTendencies {
  readonly increased: readonly PrimaryAttribute[];
  readonly decreased: readonly PrimaryAttribute[];
}

/** 与职业配置解耦的单个种族静态配置。 */
export interface RaceConfig {
  readonly id: RaceConfigId;
  readonly name: RaceName;
  readonly nameKey: RaceNameKey;
  readonly attributeTendencies: RaceAttributeTendencies;
  readonly initialPrimaryAttributeOffset: PrimaryAttributes;
}
