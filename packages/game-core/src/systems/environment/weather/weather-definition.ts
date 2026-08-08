import { assertResourceId } from "@genesis-rift/shared";

import type { WeatherCardId } from "./weather-card.ts";
import { isJokerWeatherCard } from "./weather-card.ts";
import {
  STANDARD_WEATHER_CARD_IDS,
  WEATHER_CATEGORIES,
  WEATHER_COEXISTENCE_POLICIES,
  WEATHER_DISASTER_PHASES,
  WEATHER_SCOPE_TYPES,
} from "./weather-config.ts";

/** 描述普通、极端与特殊天气的配置类别。 */
export type WeatherCategory = (typeof WEATHER_CATEGORIES)[number];

/** 描述天气配置允许使用的空间作用范围。 */
export type WeatherScopeType = (typeof WEATHER_SCOPE_TYPES)[number];

/** 描述新天气是否替换相同范围天气或与其共存。 */
export type WeatherCoexistencePolicy = (typeof WEATHER_COEXISTENCE_POLICIES)[number];

/** 描述普通、极端或特殊天气不随运行过程改变的规则。 */
export interface WeatherDefinition {
  readonly weatherId: string;
  readonly name: string;
  readonly description: string;
  readonly category: WeatherCategory;
  readonly durationRounds: number;
  readonly scopeType: WeatherScopeType;
  readonly coexistencePolicy: WeatherCoexistencePolicy;
  readonly tags: readonly string[];
  readonly hasNumericEffect: boolean;
  readonly avoidanceTypes: readonly string[];
  readonly effectIds: readonly string[];
}

/** 描述以天气资源标识索引的只读天气注册表。 */
export type WeatherDefinitionCatalog = Readonly<Record<string, WeatherDefinition>>;

/** 描述重大气候灾害固定使用的阶段。 */
export type WeatherDisasterPhase = (typeof WEATHER_DISASTER_PHASES)[number];

/** 描述重大气候灾害中一个连续阶段的持续时间与外部效果。 */
export interface WeatherDisasterPhaseDefinition {
  readonly phase: WeatherDisasterPhase;
  readonly rounds: number;
  readonly effectIds: readonly string[];
}

/** 描述大小王触发的重大气候灾害配置。 */
export interface WeatherDisasterDefinition {
  readonly weatherId: string;
  readonly name: string;
  readonly description: string;
  readonly scopeType: WeatherScopeType;
  readonly tags: readonly string[];
  readonly phases: readonly WeatherDisasterPhaseDefinition[];
  readonly shelterTypes: readonly string[];
  readonly wildernessCountermeasureIds: readonly string[];
  readonly postDisasterEventPoolId: string;
}

/** 描述以灾害天气资源标识索引的只读灾害注册表。 */
export type WeatherDisasterDefinitionCatalog = Readonly<Record<string, WeatherDisasterDefinition>>;

/** 描述一张标准天气牌对应的普通天气或重大灾害资源。 */
export interface WeatherCardMappingDefinition {
  readonly cardId: WeatherCardId;
  readonly weatherId: string;
  readonly kind: "WEATHER" | "DISASTER";
}

/** 描述以54张标准牌面索引的只读天气映射表。 */
export type WeatherCardMappingCatalog = Readonly<
  Partial<Record<WeatherCardId, WeatherCardMappingDefinition>>
>;

/**
 * 方法名：validateWeatherDefinition
 * 作用：校验普通、极端或特殊天气的资源标识、持续时间、范围与规则字段。
 * @param definition 需要校验的天气静态定义。
 * @returns 无返回值。
 * @throws 任意配置字段不符合天气规范时抛出错误。
 */
export function validateWeatherDefinition(definition: WeatherDefinition): void {
  assertResourceId(definition.weatherId, "weather");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.description, "description");

  if (!WEATHER_CATEGORIES.includes(definition.category)) {
    throw new RangeError(`Unsupported weather category: ${definition.category}`);
  }

  if (!WEATHER_SCOPE_TYPES.includes(definition.scopeType)) {
    throw new RangeError(`Unsupported weather scope type: ${definition.scopeType}`);
  }

  if (!WEATHER_COEXISTENCE_POLICIES.includes(definition.coexistencePolicy)) {
    throw new RangeError(`Unsupported weather coexistence policy: ${definition.coexistencePolicy}`);
  }

  assertPositiveSafeInteger(definition.durationRounds, "durationRounds");
  assertUniqueNonEmptyStrings(definition.tags, "tags");
  assertUniqueNonEmptyStrings(definition.avoidanceTypes, "avoidanceTypes");
  assertUniqueNonEmptyStrings(definition.effectIds, "effectIds");

  if (definition.category === "EXTREME" && definition.avoidanceTypes.length === 0) {
    throw new Error("Extreme weather must provide at least one avoidance type");
  }

  if (definition.hasNumericEffect && definition.effectIds.length === 0) {
    throw new Error("Weather with numeric effects must reference at least one effect id");
  }
}

/**
 * 方法名：validateWeatherDefinitionCatalog
 * 作用：校验天气注册表中的键值一致性与资源唯一性。
 * @param catalog 需要校验的天气静态定义注册表。
 * @returns 无返回值。
 */
export function validateWeatherDefinitionCatalog(catalog: WeatherDefinitionCatalog): void {
  for (const [weatherId, definition] of Object.entries(catalog)) {
    validateWeatherDefinition(definition);

    if (weatherId !== definition.weatherId) {
      throw new Error(`Weather catalog key does not match weather id: ${weatherId}`);
    }
  }
}

/**
 * 方法名：validateWeatherDisasterDefinition
 * 作用：校验重大气候灾害的阶段顺序、避难方式与灾后事件入口。
 * @param definition 需要校验的重大气候灾害定义。
 * @returns 无返回值。
 */
export function validateWeatherDisasterDefinition(definition: WeatherDisasterDefinition): void {
  assertResourceId(definition.weatherId, "weather");
  assertNonEmptyString(definition.name, "name");
  assertNonEmptyString(definition.description, "description");

  if (!WEATHER_SCOPE_TYPES.includes(definition.scopeType)) {
    throw new RangeError(`Unsupported disaster scope type: ${definition.scopeType}`);
  }

  assertUniqueNonEmptyStrings(definition.tags, "tags");
  assertUniqueNonEmptyStrings(definition.shelterTypes, "shelterTypes");
  assertUniqueNonEmptyStrings(
    definition.wildernessCountermeasureIds,
    "wildernessCountermeasureIds",
  );
  assertNonEmptyString(definition.postDisasterEventPoolId, "postDisasterEventPoolId");

  if (definition.shelterTypes.length === 0) {
    throw new Error("Weather disaster must provide at least one shelter type");
  }

  if (definition.wildernessCountermeasureIds.length === 0) {
    throw new Error("Weather disaster must provide at least one wilderness countermeasure");
  }

  if (
    definition.phases.length !== WEATHER_DISASTER_PHASES.length ||
    definition.phases.some((phase, index) => phase.phase !== WEATHER_DISASTER_PHASES[index])
  ) {
    throw new Error("Weather disaster phases must be WARNING, DISASTER and RECOVERY in order");
  }

  for (const phase of definition.phases) {
    assertPositiveSafeInteger(phase.rounds, `${phase.phase}.rounds`);
    assertUniqueNonEmptyStrings(phase.effectIds, `${phase.phase}.effectIds`);
  }
}

/**
 * 方法名：validateWeatherCardMappings
 * 作用：保证54张标准天气牌各自只映射到一个合法天气或灾害定义。
 * @param mappings 天气牌面映射注册表。
 * @param weatherCatalog 普通、极端与特殊天气注册表。
 * @param disasterCatalog 重大气候灾害注册表。
 * @returns 无返回值。
 */
export function validateWeatherCardMappings(
  mappings: WeatherCardMappingCatalog,
  weatherCatalog: WeatherDefinitionCatalog,
  disasterCatalog: WeatherDisasterDefinitionCatalog,
): void {
  const mappingKeys = Object.keys(mappings);

  if (mappingKeys.length !== STANDARD_WEATHER_CARD_IDS.length) {
    throw new Error(`Weather card mappings must contain ${STANDARD_WEATHER_CARD_IDS.length} cards`);
  }

  for (const cardId of STANDARD_WEATHER_CARD_IDS) {
    const mapping = mappings[cardId];

    if (mapping === undefined || mapping.cardId !== cardId) {
      throw new Error(`Missing or mismatched weather card mapping: ${cardId}`);
    }

    assertResourceId(mapping.weatherId, "weather");

    if (isJokerWeatherCard(cardId) !== (mapping.kind === "DISASTER")) {
      throw new Error(`Only jokers may map to major weather disasters: ${cardId}`);
    }

    if (mapping.kind === "WEATHER" && weatherCatalog[mapping.weatherId] === undefined) {
      throw new Error(`Weather card references unknown weather: ${mapping.weatherId}`);
    }

    if (mapping.kind === "DISASTER" && disasterCatalog[mapping.weatherId] === undefined) {
      throw new Error(`Weather card references unknown disaster: ${mapping.weatherId}`);
    }
  }
}

/**
 * 方法名：assertUniqueNonEmptyStrings
 * 作用：校验配置数组中的字符串非空且不重复。
 * @param values 需要校验的配置字符串集合。
 * @param field 字段名称。
 * @returns 无返回值。
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

/** 校验字符串包含有效内容。 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}

/** 校验数值为正安全整数。 */
function assertPositiveSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
