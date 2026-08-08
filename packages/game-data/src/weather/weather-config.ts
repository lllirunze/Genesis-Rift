import type {
  WeatherCardId,
  WeatherCardMappingCatalog,
  WeatherCategory,
  WeatherCoexistencePolicy,
  WeatherDefinition,
  WeatherDefinitionCatalog,
  WeatherDisasterDefinition,
  WeatherDisasterDefinitionCatalog,
  WeatherScopeType,
} from "@genesis-rift/game-core";

/** 极端天气通用的户外规避方式。 */
const OUTDOOR_WEATHER_AVOIDANCE_TYPES = ["building", "cave", "underground"] as const;

/**
 * 方法名：createWeatherCardConfiguration
 * 作用：创建一张牌面与天气资源一一对应的静态配置。
 * @param cardId 标准天气牌面标识。
 * @param weatherId 稳定的天气资源标识。
 * @param name 天气英文名称。
 * @param category 天气影响类别。
 * @param scopeType 天气默认作用范围。
 * @param tags 供其他系统读取的标准标签。
 * @param effectIds 需要外部系统执行的标准环境效果。
 * @returns 可同时生成天气注册表与牌面映射的配置。
 */
function createWeatherCardConfiguration(
  cardId: Exclude<WeatherCardId, "JOKER_SMALL" | "JOKER_BIG">,
  weatherId: string,
  name: string,
  category: WeatherCategory,
  scopeType: WeatherScopeType,
  tags: readonly string[],
  effectIds: readonly string[] = [],
): WeatherDefinition & {
  readonly cardId: Exclude<WeatherCardId, "JOKER_SMALL" | "JOKER_BIG">;
} {
  const hasNumericEffect = effectIds.length > 0;
  const coexistencePolicy: WeatherCoexistencePolicy = scopeType === "WORLD" ? "REPLACE" : "COEXIST";

  return {
    cardId,
    weatherId,
    name,
    description: `${name} becomes the current public weather condition.`,
    category,
    durationRounds: 2,
    scopeType,
    coexistencePolicy,
    tags,
    hasNumericEffect,
    avoidanceTypes: category === "EXTREME" ? OUTDOOR_WEATHER_AVOIDANCE_TYPES : [],
    effectIds,
  };
}

/** 52张非大小王牌面的静态天气配置，是普通天气内容的唯一配置来源。 */
export const WEATHER_CARD_CONFIGURATIONS = [
  createWeatherCardConfiguration(
    "HEART_A",
    "weather_000001",
    "Auspicious Clouds",
    "SPECIAL",
    "WORLD",
    ["warm", "luck"],
    ["weather.personal-reroll"],
  ),
  createWeatherCardConfiguration("HEART_2", "weather_000002", "Gentle Breeze", "NORMAL", "WORLD", [
    "wind",
    "mild",
  ]),
  createWeatherCardConfiguration("HEART_3", "weather_000003", "Clear Sky", "NORMAL", "WORLD", [
    "clear",
    "sunlight",
  ]),
  createWeatherCardConfiguration("HEART_4", "weather_000005", "Warm Sun", "NORMAL", "WORLD", [
    "clear",
    "warm",
  ]),
  createWeatherCardConfiguration("HEART_5", "weather_000006", "Evening Glow", "NORMAL", "WORLD", [
    "clear",
    "sunset",
  ]),
  createWeatherCardConfiguration("HEART_6", "weather_000007", "Rainbow", "NORMAL", "WORLD", [
    "clear",
    "rainbow",
  ]),
  createWeatherCardConfiguration("HEART_7", "weather_000008", "Dry Air", "NORMAL", "WORLD", [
    "dry",
    "warm",
  ]),
  createWeatherCardConfiguration(
    "HEART_8",
    "weather_000009",
    "Extreme Heat",
    "EXTREME",
    "WORLD",
    ["heat", "outdoor"],
    ["weather.heat-accumulation"],
  ),
  createWeatherCardConfiguration(
    "HEART_9",
    "weather_000010",
    "Blazing Sun",
    "EXTREME",
    "WORLD",
    ["heat", "sunlight", "outdoor"],
    ["weather.exposure-check"],
  ),
  createWeatherCardConfiguration(
    "HEART_10",
    "weather_000011",
    "Drought",
    "EXTREME",
    "WORLD",
    ["dry", "resource"],
    ["weather.water-refresh-block"],
  ),
  createWeatherCardConfiguration(
    "HEART_J",
    "weather_000012",
    "Local Warm Breeze",
    "NORMAL",
    "REGION",
    ["wind", "warm", "local"],
  ),
  createWeatherCardConfiguration("HEART_Q", "weather_000013", "Mirage", "NORMAL", "WORLD", [
    "heat",
    "illusion",
    "composite",
  ]),
  createWeatherCardConfiguration(
    "HEART_K",
    "weather_000014",
    "Global Sunshine",
    "NORMAL",
    "WORLD",
    ["clear", "sunlight", "global"],
  ),

  createWeatherCardConfiguration("DIAMOND_A", "weather_000015", "Sun Shower", "SPECIAL", "WORLD", [
    "clear",
    "precipitation",
    "special",
  ]),
  createWeatherCardConfiguration("DIAMOND_2", "weather_000016", "Cloudy", "NORMAL", "WORLD", [
    "cloud",
  ]),
  createWeatherCardConfiguration("DIAMOND_3", "weather_000017", "Overcast", "NORMAL", "WORLD", [
    "cloud",
    "overcast",
  ]),
  createWeatherCardConfiguration("DIAMOND_4", "weather_000018", "Drizzle", "NORMAL", "WORLD", [
    "precipitation",
    "rain",
  ]),
  createWeatherCardConfiguration("DIAMOND_5", "weather_000019", "Light Rain", "NORMAL", "WORLD", [
    "precipitation",
    "rain",
  ]),
  createWeatherCardConfiguration("DIAMOND_6", "weather_000020", "Shower", "NORMAL", "WORLD", [
    "precipitation",
    "rain",
  ]),
  createWeatherCardConfiguration(
    "DIAMOND_7",
    "weather_000021",
    "Continuous Clouds",
    "NORMAL",
    "WORLD",
    ["cloud", "humid"],
  ),
  createWeatherCardConfiguration(
    "DIAMOND_8",
    "weather_000022",
    "Heavy Rain",
    "EXTREME",
    "WORLD",
    ["precipitation", "rain", "mud"],
    ["weather.muddy-movement"],
  ),
  createWeatherCardConfiguration(
    "DIAMOND_9",
    "weather_000023",
    "Rainstorm",
    "EXTREME",
    "WORLD",
    ["precipitation", "storm", "mud"],
    ["weather.rainstorm-rules"],
  ),
  createWeatherCardConfiguration(
    "DIAMOND_10",
    "weather_000024",
    "Hail",
    "EXTREME",
    "WORLD",
    ["hail", "outdoor"],
    ["weather.hail-check"],
  ),
  createWeatherCardConfiguration(
    "DIAMOND_J",
    "weather_000025",
    "Local Rainstorm",
    "NORMAL",
    "REGION",
    ["precipitation", "rain", "local"],
  ),
  createWeatherCardConfiguration("DIAMOND_Q", "weather_000026", "Warm Rain", "NORMAL", "WORLD", [
    "warm",
    "precipitation",
    "composite",
  ]),
  createWeatherCardConfiguration("DIAMOND_K", "weather_000027", "Global Rain", "NORMAL", "WORLD", [
    "precipitation",
    "rain",
    "global",
  ]),

  createWeatherCardConfiguration(
    "CLUB_A",
    "weather_000028",
    "Day Night Temperature Shift",
    "SPECIAL",
    "WORLD",
    ["temperature", "day-night", "special"],
    ["weather.day-night-temperature"],
  ),
  createWeatherCardConfiguration("CLUB_2", "weather_000029", "Light Fog", "NORMAL", "WORLD", [
    "fog",
    "visibility",
  ]),
  createWeatherCardConfiguration("CLUB_3", "weather_000030", "Cool Air", "NORMAL", "WORLD", [
    "cool",
    "mild",
  ]),
  createWeatherCardConfiguration("CLUB_4", "weather_000031", "Humid Heat", "NORMAL", "WORLD", [
    "heat",
    "humid",
  ]),
  createWeatherCardConfiguration("CLUB_5", "weather_000032", "Dew", "NORMAL", "WORLD", [
    "humid",
    "dew",
  ]),
  createWeatherCardConfiguration("CLUB_6", "weather_000033", "Light Frost", "NORMAL", "WORLD", [
    "cold",
    "frost",
  ]),
  createWeatherCardConfiguration("CLUB_7", "weather_000034", "Floating Dust", "NORMAL", "WORLD", [
    "dust",
    "visibility",
  ]),
  createWeatherCardConfiguration(
    "CLUB_8",
    "weather_000035",
    "Dense Fog",
    "EXTREME",
    "WORLD",
    ["fog", "visibility"],
    ["weather.vision-minus-one"],
  ),
  createWeatherCardConfiguration(
    "CLUB_9",
    "weather_000036",
    "Sandstorm",
    "EXTREME",
    "WORLD",
    ["dust", "storm", "visibility"],
    ["weather.sandstorm-rules"],
  ),
  createWeatherCardConfiguration(
    "CLUB_10",
    "weather_000037",
    "Cold Wave",
    "EXTREME",
    "WORLD",
    ["cold", "outdoor"],
    ["weather.cold-accumulation"],
  ),
  createWeatherCardConfiguration("CLUB_J", "weather_000038", "Local Fog", "NORMAL", "REGION", [
    "fog",
    "visibility",
    "local",
  ]),
  createWeatherCardConfiguration("CLUB_Q", "weather_000039", "Frozen Fog", "NORMAL", "WORLD", [
    "fog",
    "cold",
    "composite",
  ]),
  createWeatherCardConfiguration("CLUB_K", "weather_000040", "Global Cold Fog", "NORMAL", "WORLD", [
    "fog",
    "cold",
    "global",
  ]),

  createWeatherCardConfiguration(
    "SPADE_A",
    "weather_000041",
    "Tracking Thunder Cloud",
    "SPECIAL",
    "TARGET_REGION",
    ["thunder", "tracking", "special"],
    ["weather.tracking-thunder-cloud"],
  ),
  createWeatherCardConfiguration(
    "SPADE_2",
    "weather_000042",
    "Distant Thunder",
    "NORMAL",
    "WORLD",
    ["thunder", "distant"],
  ),
  createWeatherCardConfiguration("SPADE_3", "weather_000043", "Gust", "NORMAL", "WORLD", [
    "wind",
    "mild",
  ]),
  createWeatherCardConfiguration(
    "SPADE_4",
    "weather_000044",
    "Gathering Storm Clouds",
    "NORMAL",
    "WORLD",
    ["cloud", "storm"],
  ),
  createWeatherCardConfiguration("SPADE_5", "weather_000045", "Strong Wind", "NORMAL", "WORLD", [
    "wind",
    "strong",
  ]),
  createWeatherCardConfiguration("SPADE_6", "weather_000046", "Thunder Shower", "NORMAL", "WORLD", [
    "thunder",
    "precipitation",
  ]),
  createWeatherCardConfiguration("SPADE_7", "weather_000047", "Cold Wind", "NORMAL", "WORLD", [
    "wind",
    "cold",
  ]),
  createWeatherCardConfiguration(
    "SPADE_8",
    "weather_000048",
    "Severe Thunderstorm",
    "EXTREME",
    "WORLD",
    ["thunder", "storm", "outdoor"],
    ["weather.outdoor-device-limit"],
  ),
  createWeatherCardConfiguration(
    "SPADE_9",
    "weather_000004",
    "Blizzard",
    "EXTREME",
    "WORLD",
    ["snow", "storm", "cold"],
    ["weather.blizzard-movement", "weather.vision-minus-one"],
  ),
  createWeatherCardConfiguration(
    "SPADE_10",
    "weather_000049",
    "Typhoon Warning",
    "EXTREME",
    "WORLD",
    ["wind", "warning", "storm"],
    ["weather.typhoon-warning"],
  ),
  createWeatherCardConfiguration("SPADE_J", "weather_000050", "Local Gale", "NORMAL", "REGION", [
    "wind",
    "local",
  ]),
  createWeatherCardConfiguration("SPADE_Q", "weather_000051", "Thunder Snow", "NORMAL", "WORLD", [
    "thunder",
    "snow",
    "composite",
  ]),
  createWeatherCardConfiguration(
    "SPADE_K",
    "weather_000052",
    "Global Thunderstorm",
    "NORMAL",
    "WORLD",
    ["thunder", "storm", "global"],
  ),
] as const satisfies readonly (WeatherDefinition & {
  readonly cardId: Exclude<WeatherCardId, "JOKER_SMALL" | "JOKER_BIG">;
})[];

/** 小王触发的五轮地区性台风灾害。 */
export const REGIONAL_TYPHOON_DISASTER_DEFINITION = {
  weatherId: "weather_000053",
  name: "Regional Typhoon",
  description: "A regional typhoon progresses through warning, disaster and recovery stages.",
  scopeType: "REGION",
  tags: ["major-disaster", "typhoon", "wind"],
  phases: [
    { phase: "WARNING", rounds: 1, effectIds: ["weather.typhoon-warning"] },
    { phase: "DISASTER", rounds: 3, effectIds: ["weather.typhoon-disaster"] },
    { phase: "RECOVERY", rounds: 1, effectIds: ["weather.typhoon-recovery"] },
  ],
  shelterTypes: ["town", "village", "strong-building", "underground"],
  wildernessCountermeasureIds: ["tent", "waterproof-gear", "teleport-scroll"],
  postDisasterEventPoolId: "event-pool.weather.typhoon-recovery",
} as const satisfies WeatherDisasterDefinition;

/** 大王触发的八轮全域超级台风灾害。 */
export const SUPER_TYPHOON_DISASTER_DEFINITION = {
  weatherId: "weather_000054",
  name: "Super Typhoon",
  description: "A world-wide super typhoon changes every player's priorities for eight rounds.",
  scopeType: "WORLD",
  tags: ["major-disaster", "super-typhoon", "wind", "world"],
  phases: [
    { phase: "WARNING", rounds: 2, effectIds: ["weather.super-typhoon-warning"] },
    { phase: "DISASTER", rounds: 4, effectIds: ["weather.super-typhoon-disaster"] },
    { phase: "RECOVERY", rounds: 2, effectIds: ["weather.super-typhoon-recovery"] },
  ],
  shelterTypes: ["town", "strong-building", "cave", "underground"],
  wildernessCountermeasureIds: ["tent", "rope", "waterproof-gear", "teleport-scroll"],
  postDisasterEventPoolId: "event-pool.weather.super-typhoon-recovery",
} as const satisfies WeatherDisasterDefinition;

/** 根据静态配置生成普通、极端与特殊天气注册表。 */
export const WEATHER_DEFINITION_CATALOG = Object.fromEntries(
  WEATHER_CARD_CONFIGURATIONS.map(({ cardId: _cardId, ...definition }) => [
    definition.weatherId,
    definition,
  ]),
) as WeatherDefinitionCatalog;

/** 根据静态配置装配大小王重大气候灾害注册表。 */
export const WEATHER_DISASTER_DEFINITION_CATALOG = {
  [REGIONAL_TYPHOON_DISASTER_DEFINITION.weatherId]: REGIONAL_TYPHOON_DISASTER_DEFINITION,
  [SUPER_TYPHOON_DISASTER_DEFINITION.weatherId]: SUPER_TYPHOON_DISASTER_DEFINITION,
} as const satisfies WeatherDisasterDefinitionCatalog;

/** 根据静态配置装配54张天气牌到天气或灾害资源的完整映射。 */
export const WEATHER_CARD_MAPPING_CATALOG = {
  ...Object.fromEntries(
    WEATHER_CARD_CONFIGURATIONS.map((configuration) => [
      configuration.cardId,
      {
        cardId: configuration.cardId,
        weatherId: configuration.weatherId,
        kind: "WEATHER" as const,
      },
    ]),
  ),
  JOKER_SMALL: {
    cardId: "JOKER_SMALL",
    weatherId: REGIONAL_TYPHOON_DISASTER_DEFINITION.weatherId,
    kind: "DISASTER",
  },
  JOKER_BIG: {
    cardId: "JOKER_BIG",
    weatherId: SUPER_TYPHOON_DISASTER_DEFINITION.weatherId,
    kind: "DISASTER",
  },
} as WeatherCardMappingCatalog;
