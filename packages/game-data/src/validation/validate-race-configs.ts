import {
  getPrimaryAttributeTotal,
  PRIMARY_ATTRIBUTE_KEYS,
} from "../attributes/primary-attributes.ts";
import type { RaceConfig } from "../races/race-config.ts";

const RACE_ATTRIBUTE_OFFSET_TOTAL = 0;

/**
 * 方法名：validateRaceConfig
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param config 待使用或校验的配置。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateRaceConfig(config: RaceConfig): void {
  for (const attribute of PRIMARY_ATTRIBUTE_KEYS) {
    const value = config.initialPrimaryAttributeOffset[attribute];

    if (!Number.isInteger(value)) {
      throw new Error(`${config.id}.${attribute} offset must be an integer`);
    }
  }

  const total = getPrimaryAttributeTotal(config.initialPrimaryAttributeOffset);

  if (total !== RACE_ATTRIBUTE_OFFSET_TOTAL) {
    throw new Error(
      `${config.id} initial primary attribute offset total must be ${RACE_ATTRIBUTE_OFFSET_TOTAL}, received ${total}`,
    );
  }

  validateAttributeTendencies(config);
}

/**
 * 方法名：validateAttributeTendencies
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param config 待使用或校验的配置。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function validateAttributeTendencies(config: RaceConfig): void {
  const { increased, decreased } = config.attributeTendencies;
  const tendencyAttributes = [...increased, ...decreased];

  if (new Set(tendencyAttributes).size !== tendencyAttributes.length) {
    throw new Error(`${config.id} attribute tendencies must not contain duplicates`);
  }

  for (const attribute of increased) {
    if (config.initialPrimaryAttributeOffset[attribute] <= 0) {
      throw new Error(`${config.id}.${attribute} must have a positive offset`);
    }
  }

  for (const attribute of decreased) {
    if (config.initialPrimaryAttributeOffset[attribute] >= 0) {
      throw new Error(`${config.id}.${attribute} must have a negative offset`);
    }
  }

  const neutralAttributes = PRIMARY_ATTRIBUTE_KEYS.filter(
    (attribute) => !tendencyAttributes.includes(attribute),
  );

  for (const attribute of neutralAttributes) {
    if (config.initialPrimaryAttributeOffset[attribute] !== 0) {
      throw new Error(`${config.id}.${attribute} must have a neutral offset`);
    }
  }
}

/**
 * 方法名：validateRaceConfigs
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param configs 方法所需的 configs 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
export function validateRaceConfigs(configs: readonly RaceConfig[]): void {
  const ids = new Set<string>();

  for (const config of configs) {
    if (ids.has(config.id)) {
      throw new Error(`Duplicate race config id: ${config.id}`);
    }

    ids.add(config.id);
    validateRaceConfig(config);
  }
}
