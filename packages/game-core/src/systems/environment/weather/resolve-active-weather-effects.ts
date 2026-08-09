import type { NormalMovementRuleResolver } from "../../map/movement/normal-movement-rule.ts";
import {
  getTerrainDefinition,
  type TerrainDefinitionCatalog,
} from "../../map/model/terrain-definition.ts";
import {
  MAX_TOTAL_WEATHER_MOVEMENT_COST_MODIFIER,
  WEATHER_VISION_MODIFIER_SOURCE_ID,
} from "./weather-effect-config.ts";
import {
  validateWeatherEffectDefinition,
  type WeatherEffectDefinition,
  type WeatherEffectDefinitionCatalog,
} from "./weather-effect-definition.ts";
import type {
  WeatherDefinitionCatalog,
  WeatherDisasterDefinitionCatalog,
  WeatherScopeType,
} from "./weather-definition.ts";
import type { WeatherRuntimeState } from "./weather-runtime-state.ts";

/** 描述天气效果针对一个地图位置进行解析时所需的环境信息。 */
export interface WeatherTileEffectContext {
  readonly regionDefinitionId: string;
  readonly terrainDefinitionId: string;
  readonly terrainTags: readonly string[];
}

/** 描述当前天气对一个地图位置产生的可立即执行规则。 */
export interface ResolvedWeatherTileEffects {
  readonly movementCostModifier: number;
  readonly visionRangeModifier: number;
  readonly movementBlocked: boolean;
  readonly appliedEffectIds: readonly string[];
  readonly deferredEffectIds: readonly string[];
}

/** 描述可直接传入地图统一视野计算的天气环境修正。 */
export interface WeatherVisionRangeModifier {
  readonly sourceId: string;
  readonly kind: "environment";
  readonly offset: number;
}

/** 描述解析天气地图效果所需的静态定义集合。 */
export interface WeatherEffectResolutionDependencies {
  readonly weatherDefinitions: WeatherDefinitionCatalog;
  readonly disasterDefinitions: WeatherDisasterDefinitionCatalog;
  readonly effectDefinitions: WeatherEffectDefinitionCatalog;
}

/**
 * 方法名：resolveActiveWeatherEffectsForTile
 * 作用：根据天气作用范围、灾害阶段和目标地形标签汇总当前位置的天气规则。
 * @param state 当前天气运行时状态。
 * @param context 目标位置所属区域、地形及地形标签。
 * @param dependencies 天气、灾害和效果静态定义集合。
 * @returns 移动成本、视野、通行限制及延迟效果的不可变汇总结果。
 * @throws 活动天气、灾害或效果定义缺失时抛出错误。
 */
export function resolveActiveWeatherEffectsForTile(
  state: WeatherRuntimeState,
  context: WeatherTileEffectContext,
  dependencies: WeatherEffectResolutionDependencies,
): ResolvedWeatherTileEffects {
  assertNonEmptyString(context.regionDefinitionId, "regionDefinitionId");
  assertNonEmptyString(context.terrainDefinitionId, "terrainDefinitionId");
  assertUniqueNonEmptyStrings(context.terrainTags, "terrainTags");
  const effectIds: string[] = [];

  for (const activeWeather of state.activeWeathers) {
    if (!isScopeApplicable(activeWeather.scopeType, activeWeather.scopeTargetId, context)) {
      continue;
    }

    const definition = dependencies.weatherDefinitions[activeWeather.weatherId];

    if (definition === undefined) {
      throw new Error(`Unknown active weather definition: ${activeWeather.weatherId}`);
    }

    effectIds.push(...definition.effectIds);
  }

  if (
    state.activeDisaster !== null &&
    isScopeApplicable(state.activeDisaster.scopeType, state.activeDisaster.scopeTargetId, context)
  ) {
    const definition = dependencies.disasterDefinitions[state.activeDisaster.weatherId];

    if (definition === undefined) {
      throw new Error(`Unknown active weather disaster: ${state.activeDisaster.weatherId}`);
    }

    const phase = definition.phases[state.activeDisaster.phaseIndex];

    if (phase === undefined || phase.phase !== state.activeDisaster.phase) {
      throw new Error(`Weather disaster has an invalid active phase: ${definition.weatherId}`);
    }

    effectIds.push(...phase.effectIds);
  }

  return resolveEffectIds(effectIds, context.terrainTags, dependencies.effectDefinitions);
}

/**
 * 方法名：createWeatherMovementRuleResolver
 * 作用：创建可直接注入移动结算与寻路算法的天气规则解析器。
 * @param state 当前天气运行时状态。
 * @param terrainDefinitions 地图基础地形定义注册表。
 * @param dependencies 天气、灾害和效果静态定义集合。
 * @returns 根据目标地块动态解析通行限制和额外移动成本的函数。
 */
export function createWeatherMovementRuleResolver(
  state: WeatherRuntimeState,
  terrainDefinitions: TerrainDefinitionCatalog,
  dependencies: WeatherEffectResolutionDependencies,
): NormalMovementRuleResolver {
  return ({ targetTile }) => {
    const terrain = getTerrainDefinition(terrainDefinitions, targetTile.terrainDefinitionId);
    const effects = resolveActiveWeatherEffectsForTile(
      state,
      {
        regionDefinitionId: targetTile.regionDefinitionId,
        terrainDefinitionId: targetTile.terrainDefinitionId,
        terrainTags: terrain.tags,
      },
      dependencies,
    );

    return {
      blocked: effects.movementBlocked,
      additionalCost: effects.movementCostModifier,
    };
  };
}

/**
 * 方法名：createWeatherVisionRangeModifier
 * 作用：将当前位置生效的全部天气视野效果汇总为地图统一视野计算可接收的一项环境修正。
 * @param state 当前天气运行时状态。
 * @param context 观察者当前位置所属区域、地形及地形标签。
 * @param dependencies 天气、灾害和效果静态定义集合。
 * @returns 存在天气视野影响时返回修正；没有影响时返回空值。
 * @throws 天气状态、位置上下文或静态效果定义非法时抛出错误。
 */
export function createWeatherVisionRangeModifier(
  state: WeatherRuntimeState,
  context: WeatherTileEffectContext,
  dependencies: WeatherEffectResolutionDependencies,
): WeatherVisionRangeModifier | null {
  const effects = resolveActiveWeatherEffectsForTile(state, context, dependencies);

  if (effects.visionRangeModifier === 0) {
    return null;
  }

  return Object.freeze({
    sourceId: WEATHER_VISION_MODIFIER_SOURCE_ID,
    kind: "environment",
    offset: effects.visionRangeModifier,
  });
}

/**
 * 方法名：calculateWeatherAdjustedVisionRange
 * 作用：兼容旧调用方，将天气视野修正直接应用于基础视野；新调用方应使用统一视野修正器。
 * @param baseVisionRange 角色数值系统已经计算完成的基础视野范围。
 * @param state 当前天气运行时状态。
 * @param context 观察者当前位置所属区域、地形及地形标签。
 * @param dependencies 天气、灾害和效果静态定义集合。
 * @returns 应用天气修正后的非负整数视野范围。
 * @throws 基础视野不是非负整数或天气配置缺失时抛出错误。
 */
export function calculateWeatherAdjustedVisionRange(
  baseVisionRange: number,
  state: WeatherRuntimeState,
  context: WeatherTileEffectContext,
  dependencies: WeatherEffectResolutionDependencies,
): number {
  if (!Number.isSafeInteger(baseVisionRange) || baseVisionRange < 0) {
    throw new RangeError("baseVisionRange must be a non-negative safe integer");
  }

  const modifier = createWeatherVisionRangeModifier(state, context, dependencies);

  return Math.max(0, baseVisionRange + (modifier?.offset ?? 0));
}

/**
 * 方法名：resolveEffectIds
 * 作用：汇总一组效果标识对当前地形实际产生的规则。
 * @param effectIds 当前活动天气引用的效果标识。
 * @param terrainTags 目标地形拥有的标签。
 * @param catalog 天气效果静态定义注册表。
 * @returns 当前地形最终受到的天气效果汇总。
 * @throws 任一活动效果缺少配置或配置非法时抛出错误。
 */
function resolveEffectIds(
  effectIds: readonly string[],
  terrainTags: readonly string[],
  catalog: WeatherEffectDefinitionCatalog,
): ResolvedWeatherTileEffects {
  let movementCostModifier = 0;
  let visionRangeModifier = 0;
  let movementBlocked = false;
  const appliedEffectIds: string[] = [];
  const deferredEffectIds: string[] = [];

  for (const effectId of new Set(effectIds)) {
    const definition = catalog[effectId];

    if (definition === undefined) {
      throw new Error(`Unknown active weather effect: ${effectId}`);
    }

    validateWeatherEffectDefinition(definition);

    if (definition.effectType === "DEFERRED") {
      deferredEffectIds.push(effectId);
      continue;
    }

    if (!isEffectApplicableToTerrain(definition, terrainTags)) {
      continue;
    }

    appliedEffectIds.push(effectId);

    switch (definition.effectType) {
      case "MOVEMENT_COST":
        movementCostModifier += definition.movementCostModifier;
        break;
      case "VISION_RANGE":
        visionRangeModifier += definition.visionRangeModifier;
        break;
      case "MOVEMENT_BLOCK":
        movementBlocked = true;
        break;
    }
  }

  return Object.freeze({
    movementCostModifier: Math.min(movementCostModifier, MAX_TOTAL_WEATHER_MOVEMENT_COST_MODIFIER),
    visionRangeModifier,
    movementBlocked,
    appliedEffectIds: Object.freeze(appliedEffectIds),
    deferredEffectIds: Object.freeze(deferredEffectIds),
  });
}

/**
 * 方法名：isScopeApplicable
 * 作用：判断天气实例的空间范围是否覆盖当前地图位置。
 * @param scopeType 天气实例的作用范围类型。
 * @param scopeTargetId 区域或地形范围对应的目标标识。
 * @param context 当前待判断的地图位置上下文。
 * @returns 当前天气覆盖该位置时返回 true。
 */
function isScopeApplicable(
  scopeType: WeatherScopeType,
  scopeTargetId: string | null,
  context: WeatherTileEffectContext,
): boolean {
  switch (scopeType) {
    case "WORLD":
      return true;
    case "REGION":
    case "TARGET_REGION":
      return scopeTargetId === context.regionDefinitionId;
    case "TERRAIN":
      return scopeTargetId === context.terrainDefinitionId;
  }
}

/**
 * 方法名：isEffectApplicableToTerrain
 * 作用：判断效果是否覆盖目标地形，空标签列表表示覆盖全部地形。
 * @param definition 需要判断的可执行天气效果。
 * @param terrainTags 目标地形拥有的标签。
 * @returns 效果应作用于该地形时返回 true。
 */
function isEffectApplicableToTerrain(
  definition: Exclude<WeatherEffectDefinition, { readonly effectType: "DEFERRED" }>,
  terrainTags: readonly string[],
): boolean {
  if (definition.effectType === "VISION_RANGE") {
    return true;
  }

  return (
    definition.targetTerrainTagsAny.length === 0 ||
    definition.targetTerrainTagsAny.some((tag) => terrainTags.includes(tag))
  );
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
