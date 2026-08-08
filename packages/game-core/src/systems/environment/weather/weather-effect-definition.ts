import {
  MAX_SINGLE_WEATHER_MOVEMENT_COST_MODIFIER,
  WEATHER_EFFECT_TYPES,
} from "./weather-effect-config.ts";
import type {
  WeatherDefinitionCatalog,
  WeatherDisasterDefinitionCatalog,
} from "./weather-definition.ts";

/** 描述天气效果配置允许使用的效果类型。 */
export type WeatherEffectType = (typeof WEATHER_EFFECT_TYPES)[number];

/** 描述所有天气效果共享的稳定标识与用途说明。 */
interface BaseWeatherEffectDefinition {
  readonly effectId: string;
  readonly effectType: WeatherEffectType;
  readonly description: string;
}

/** 描述进入符合标签条件的地形时增加的移动成本。 */
export interface WeatherMovementCostEffectDefinition extends BaseWeatherEffectDefinition {
  readonly effectType: "MOVEMENT_COST";
  readonly movementCostModifier: number;
  readonly targetTerrainTagsAny: readonly string[];
}

/** 描述天气对角色最终视野范围产生的整数修正。 */
export interface WeatherVisionRangeEffectDefinition extends BaseWeatherEffectDefinition {
  readonly effectType: "VISION_RANGE";
  readonly visionRangeModifier: number;
}

/** 描述天气对符合标签条件地形施加的临时通行限制。 */
export interface WeatherMovementBlockEffectDefinition extends BaseWeatherEffectDefinition {
  readonly effectType: "MOVEMENT_BLOCK";
  readonly targetTerrainTagsAny: readonly string[];
}

/** 描述已经登记但依赖其他业务系统、当前暂不执行的天气效果。 */
export interface DeferredWeatherEffectDefinition extends BaseWeatherEffectDefinition {
  readonly effectType: "DEFERRED";
  readonly dependency: string;
}

/** 描述天气系统能够统一加载的静态效果配置。 */
export type WeatherEffectDefinition =
  | WeatherMovementCostEffectDefinition
  | WeatherVisionRangeEffectDefinition
  | WeatherMovementBlockEffectDefinition
  | DeferredWeatherEffectDefinition;

/** 描述以稳定效果标识索引的天气效果配置注册表。 */
export type WeatherEffectDefinitionCatalog = Readonly<Record<string, WeatherEffectDefinition>>;

/**
 * 方法名：validateWeatherEffectDefinition
 * 作用：校验一项天气效果的标识、类型及对应参数。
 * @param definition 需要校验的天气效果静态定义。
 * @returns 无返回值。
 * @throws 配置字段缺失、类型不受支持或数值超出边界时抛出错误。
 */
export function validateWeatherEffectDefinition(definition: WeatherEffectDefinition): void {
  assertNonEmptyString(definition.effectId, "effectId");
  assertNonEmptyString(definition.description, "description");

  if (!WEATHER_EFFECT_TYPES.includes(definition.effectType)) {
    throw new RangeError(`Unsupported weather effect type: ${definition.effectType as string}`);
  }

  switch (definition.effectType) {
    case "MOVEMENT_COST":
      assertIntegerInRange(
        definition.movementCostModifier,
        1,
        MAX_SINGLE_WEATHER_MOVEMENT_COST_MODIFIER,
        "movementCostModifier",
      );
      assertUniqueNonEmptyStrings(definition.targetTerrainTagsAny, "targetTerrainTagsAny");
      return;
    case "VISION_RANGE":
      if (!Number.isSafeInteger(definition.visionRangeModifier)) {
        throw new TypeError("visionRangeModifier must be a safe integer");
      }

      if (definition.visionRangeModifier === 0) {
        throw new RangeError("visionRangeModifier must not be zero");
      }
      return;
    case "MOVEMENT_BLOCK":
      assertUniqueNonEmptyStrings(definition.targetTerrainTagsAny, "targetTerrainTagsAny");

      if (definition.targetTerrainTagsAny.length === 0) {
        throw new Error("Movement block effect must provide at least one target terrain tag");
      }
      return;
    case "DEFERRED":
      assertNonEmptyString(definition.dependency, "dependency");
      return;
  }
}

/**
 * 方法名：validateWeatherEffectDefinitionCatalog
 * 作用：校验天气效果注册表键值一致且不存在无效配置。
 * @param catalog 需要校验的天气效果注册表。
 * @returns 无返回值。
 * @throws 注册表键与效果标识不一致或配置非法时抛出错误。
 */
export function validateWeatherEffectDefinitionCatalog(
  catalog: WeatherEffectDefinitionCatalog,
): void {
  for (const [effectId, definition] of Object.entries(catalog)) {
    validateWeatherEffectDefinition(definition);

    if (effectId !== definition.effectId) {
      throw new Error(`Weather effect catalog key does not match effect id: ${effectId}`);
    }
  }
}

/**
 * 方法名：validateWeatherEffectReferences
 * 作用：校验所有普通天气和灾害阶段引用的效果均已登记。
 * @param weatherCatalog 普通、极端与特殊天气注册表。
 * @param disasterCatalog 重大气候灾害注册表。
 * @param effectCatalog 天气效果注册表。
 * @returns 无返回值。
 * @throws 任一天气引用不存在的效果标识时抛出错误。
 */
export function validateWeatherEffectReferences(
  weatherCatalog: WeatherDefinitionCatalog,
  disasterCatalog: WeatherDisasterDefinitionCatalog,
  effectCatalog: WeatherEffectDefinitionCatalog,
): void {
  validateWeatherEffectDefinitionCatalog(effectCatalog);

  for (const definition of Object.values(weatherCatalog)) {
    assertKnownEffectIds(definition.effectIds, effectCatalog, definition.weatherId);
  }

  for (const definition of Object.values(disasterCatalog)) {
    for (const phase of definition.phases) {
      assertKnownEffectIds(
        phase.effectIds,
        effectCatalog,
        `${definition.weatherId}.${phase.phase}`,
      );
    }
  }
}

/**
 * 方法名：assertKnownEffectIds
 * 作用：校验一组天气效果标识均存在于统一注册表。
 * @param effectIds 需要检查的天气效果标识。
 * @param catalog 天气效果静态定义注册表。
 * @param sourceId 引用这些效果的天气或灾害阶段标识。
 * @returns 无返回值。
 * @throws 任一效果没有配置时抛出错误。
 */
function assertKnownEffectIds(
  effectIds: readonly string[],
  catalog: WeatherEffectDefinitionCatalog,
  sourceId: string,
): void {
  for (const effectId of effectIds) {
    if (catalog[effectId] === undefined) {
      throw new Error(`Weather ${sourceId} references unknown effect: ${effectId}`);
    }
  }
}

/**
 * 方法名：assertUniqueNonEmptyStrings
 * 作用：校验字符串数组中的值均非空且不重复。
 * @param values 需要校验的字符串数组。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数组存在空字符串或重复值时抛出错误。
 */
function assertUniqueNonEmptyStrings(values: readonly string[], field: string): void {
  const uniqueValues = new Set<string>();

  for (const value of values) {
    assertNonEmptyString(value, field);

    if (uniqueValues.has(value)) {
      throw new Error(`Duplicate ${field} value: ${value}`);
    }

    uniqueValues.add(value);
  }
}

/**
 * 方法名：assertIntegerInRange
 * 作用：校验整数处于指定闭区间。
 * @param value 需要校验的数值。
 * @param minimum 允许的最小值。
 * @param maximum 允许的最大值。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 数值不是安全整数或超出范围时抛出错误。
 */
function assertIntegerInRange(
  value: number,
  minimum: number,
  maximum: number,
  field: string,
): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${field} must be between ${minimum} and ${maximum}`);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验字符串包含可用内容。
 * @param value 需要校验的字符串。
 * @param field 出现在错误信息中的字段名称。
 * @returns 无返回值。
 * @throws 字符串为空时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
