import type { WeatherEffectDefinitionCatalog } from "@genesis-rift/game-core";

/** 天气效果静态配置；尚未接入依赖系统的效果使用 DEFERRED 显式登记。 */
export const WEATHER_EFFECT_DEFINITION_CATALOG = {
  "weather.muddy-movement": {
    effectId: "weather.muddy-movement",
    effectType: "MOVEMENT_COST",
    description: "Muddy open and vegetated terrain costs one additional movement point.",
    movementCostModifier: 1,
    targetTerrainTagsAny: ["open", "vegetation"],
  },
  "weather.vision-minus-one": {
    effectId: "weather.vision-minus-one",
    effectType: "VISION_RANGE",
    description: "Current vision range is reduced by one tile.",
    visionRangeModifier: -1,
  },
  "weather.blizzard-movement": {
    effectId: "weather.blizzard-movement",
    effectType: "MOVEMENT_COST",
    description: "Every terrain costs two additional movement points during a blizzard.",
    movementCostModifier: 2,
    targetTerrainTagsAny: [],
  },
  "weather.personal-reroll": createDeferredEffect(
    "weather.personal-reroll",
    "random",
    "Personal random results may be rerolled under the configured rule.",
  ),
  "weather.heat-accumulation": createDeferredEffect(
    "weather.heat-accumulation",
    "status",
    "Outdoor characters accumulate heat exposure.",
  ),
  "weather.exposure-check": createDeferredEffect(
    "weather.exposure-check",
    "status",
    "Outdoor characters perform an environmental exposure check.",
  ),
  "weather.water-refresh-block": createDeferredEffect(
    "weather.water-refresh-block",
    "resource",
    "Water resource refresh is temporarily blocked.",
  ),
  "weather.rainstorm-rules": createDeferredEffect(
    "weather.rainstorm-rules",
    "status-and-map",
    "Rainstorm applies its extended status and map rules.",
  ),
  "weather.hail-check": createDeferredEffect(
    "weather.hail-check",
    "status",
    "Outdoor characters perform a hail protection check.",
  ),
  "weather.day-night-temperature": createDeferredEffect(
    "weather.day-night-temperature",
    "day-night",
    "Temperature changes according to the current day and night phase.",
  ),
  "weather.sandstorm-rules": createDeferredEffect(
    "weather.sandstorm-rules",
    "status-and-map",
    "Sandstorm applies its extended status and map rules.",
  ),
  "weather.cold-accumulation": createDeferredEffect(
    "weather.cold-accumulation",
    "status",
    "Outdoor characters accumulate cold exposure.",
  ),
  "weather.tracking-thunder-cloud": createDeferredEffect(
    "weather.tracking-thunder-cloud",
    "targeting",
    "A thunder cloud follows its selected target region.",
  ),
  "weather.outdoor-device-limit": createDeferredEffect(
    "weather.outdoor-device-limit",
    "item",
    "Outdoor electrical devices are restricted.",
  ),
  "weather.typhoon-warning": createDeferredEffect(
    "weather.typhoon-warning",
    "disaster",
    "Regional typhoon warning rules are active.",
  ),
  "weather.typhoon-disaster": createDeferredEffect(
    "weather.typhoon-disaster",
    "disaster",
    "Regional typhoon disaster rules are active.",
  ),
  "weather.typhoon-recovery": createDeferredEffect(
    "weather.typhoon-recovery",
    "disaster",
    "Regional typhoon recovery rules are active.",
  ),
  "weather.super-typhoon-warning": createDeferredEffect(
    "weather.super-typhoon-warning",
    "disaster",
    "Super typhoon warning rules are active.",
  ),
  "weather.super-typhoon-disaster": createDeferredEffect(
    "weather.super-typhoon-disaster",
    "disaster",
    "Super typhoon disaster rules are active.",
  ),
  "weather.super-typhoon-recovery": createDeferredEffect(
    "weather.super-typhoon-recovery",
    "disaster",
    "Super typhoon recovery rules are active.",
  ),
} as const satisfies WeatherEffectDefinitionCatalog;

/**
 * 方法名：createDeferredEffect
 * 作用：创建已经登记、但需要等待其他业务系统后续接入的天气效果配置。
 * @param effectId 天气效果使用的稳定标识。
 * @param dependency 后续执行该效果需要依赖的业务模块。
 * @param description 天气效果的英文用途说明。
 * @returns 可加入天气效果注册表的延迟效果配置。
 */
function createDeferredEffect(effectId: string, dependency: string, description: string) {
  return {
    effectId,
    effectType: "DEFERRED" as const,
    description,
    dependency,
  };
}
