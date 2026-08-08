import type {
  WeatherDefinition,
  WeatherDefinitionCatalog,
  WeatherDisasterDefinition,
  WeatherDisasterDefinitionCatalog,
  WeatherDisasterPhase,
  WeatherScopeType,
} from "./weather-definition.ts";
import {
  validateWeatherDefinition,
  validateWeatherDisasterDefinition,
} from "./weather-definition.ts";

/** 描述运行时天气来自牌组、事件或其他公开规则。 */
export type WeatherSourceType = "CARD" | "EVENT" | "SYSTEM";

/** 描述一项普通、极端或特殊天气的运行时状态。 */
export interface ActiveWeatherInstance {
  readonly instanceId: string;
  readonly weatherId: string;
  readonly sourceType: WeatherSourceType;
  readonly sourceId: string;
  readonly scopeType: WeatherScopeType;
  readonly scopeTargetId: string | null;
  readonly startedRound: number;
  readonly remainingRounds: number;
}

/** 描述当前唯一生效的重大气候灾害及其阶段进度。 */
export interface ActiveWeatherDisasterInstance {
  readonly instanceId: string;
  readonly weatherId: string;
  readonly sourceType: WeatherSourceType;
  readonly sourceId: string;
  readonly scopeType: WeatherScopeType;
  readonly scopeTargetId: string | null;
  readonly startedRound: number;
  readonly phase: WeatherDisasterPhase;
  readonly phaseIndex: number;
  readonly remainingPhaseRounds: number;
}

/** 描述天气系统需要持久化和回放的完整运行时状态。 */
export interface WeatherRuntimeState {
  readonly activeWeathers: readonly ActiveWeatherInstance[];
  readonly activeDisaster: ActiveWeatherDisasterInstance | null;
  readonly requiresRecoveryDraw: boolean;
  readonly lastAdvancedRound: number;
}

/** 描述创建普通、极端、特殊或事件天气状态所需的输入。 */
export interface ApplyWeatherInput {
  readonly instanceId: string;
  readonly sourceType: WeatherSourceType;
  readonly sourceId: string;
  readonly startedRound: number;
  readonly scopeTargetId?: string | null;
  readonly durationRounds?: number;
  readonly scopeType?: WeatherScopeType;
  readonly coexistencePolicy?: WeatherDefinition["coexistencePolicy"];
  readonly completesRecoveryDraw?: boolean;
}

/** 描述创建重大气候灾害状态所需的输入。 */
export interface StartWeatherDisasterInput {
  readonly instanceId: string;
  readonly sourceType: WeatherSourceType;
  readonly sourceId: string;
  readonly startedRound: number;
  readonly scopeTargetId?: string | null;
}

/** 描述天气轮末推进后结束和切换的状态变化。 */
export interface AdvanceWeatherRuntimeResult {
  readonly state: WeatherRuntimeState;
  readonly expiredWeathers: readonly ActiveWeatherInstance[];
  readonly previousDisasterPhase: WeatherDisasterPhase | null;
  readonly currentDisasterPhase: WeatherDisasterPhase | null;
  readonly disasterEnded: boolean;
}

/**
 * 方法名：createWeatherRuntimeState
 * 作用：创建没有活动天气或重大灾害的初始运行时状态。
 * @returns 冻结后的空天气运行时状态。
 */
export function createWeatherRuntimeState(): WeatherRuntimeState {
  return freezeState({
    activeWeathers: [],
    activeDisaster: null,
    requiresRecoveryDraw: false,
    lastAdvancedRound: 0,
  });
}

/**
 * 方法名：applyWeather
 * 作用：根据天气范围与共存规则创建天气，并替换相同作用范围的旧天气。
 * @param state 当前天气运行时状态。
 * @param definition 需要生效的天气静态定义。
 * @param input 来源、作用目标、持续时间与开始轮次。
 * @returns 应用天气后的不可变运行时状态。
 */
export function applyWeather(
  state: WeatherRuntimeState,
  definition: WeatherDefinition,
  input: ApplyWeatherInput,
): WeatherRuntimeState {
  validateWeatherDefinition(definition);
  assertWeatherInstanceIdAvailable(state, input.instanceId);
  validateSourceInput(input);

  if (state.activeDisaster !== null) {
    throw new Error("Ordinary weather cannot start during an active major disaster");
  }

  const scopeType = input.scopeType ?? definition.scopeType;
  const coexistencePolicy = input.coexistencePolicy ?? definition.coexistencePolicy;
  const scopeTargetId = normalizeScopeTarget(scopeType, input.scopeTargetId);
  const durationRounds = input.durationRounds ?? definition.durationRounds;
  assertPositiveSafeInteger(durationRounds, "durationRounds");

  const activeWeather: ActiveWeatherInstance = Object.freeze({
    instanceId: input.instanceId,
    weatherId: definition.weatherId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    scopeType,
    scopeTargetId,
    startedRound: input.startedRound,
    remainingRounds: durationRounds,
  });
  const retained =
    coexistencePolicy === "COEXIST"
      ? state.activeWeathers
      : state.activeWeathers.filter(
          (weather) =>
            weather.scopeType !== activeWeather.scopeType ||
            weather.scopeTargetId !== activeWeather.scopeTargetId,
        );

  return freezeState({
    ...state,
    activeWeathers: [...retained, activeWeather],
    requiresRecoveryDraw: input.completesRecoveryDraw ? false : state.requiresRecoveryDraw,
  });
}

/**
 * 方法名：startWeatherDisaster
 * 作用：结束全部普通天气并启动重大气候灾害的预警阶段。
 * @param state 当前天气运行时状态。
 * @param definition 需要启动的重大气候灾害定义。
 * @param input 灾害实例、来源、开始轮次与作用目标。
 * @returns 只保留新重大灾害的运行时状态。
 */
export function startWeatherDisaster(
  state: WeatherRuntimeState,
  definition: WeatherDisasterDefinition,
  input: StartWeatherDisasterInput,
): WeatherRuntimeState {
  validateWeatherDisasterDefinition(definition);
  assertWeatherInstanceIdAvailable(state, input.instanceId);
  validateSourceInput(input);

  if (state.activeDisaster !== null) {
    throw new Error("A major weather disaster is already active");
  }

  const firstPhase = definition.phases[0]!;

  return freezeState({
    ...state,
    activeWeathers: [],
    activeDisaster: Object.freeze({
      instanceId: input.instanceId,
      weatherId: definition.weatherId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      scopeType: definition.scopeType,
      scopeTargetId: normalizeScopeTarget(definition.scopeType, input.scopeTargetId),
      startedRound: input.startedRound,
      phase: firstPhase.phase,
      phaseIndex: 0,
      remainingPhaseRounds: firstPhase.rounds,
    }),
    requiresRecoveryDraw: false,
  });
}

/**
 * 方法名：advanceWeatherRuntimeAtRoundEnd
 * 作用：在完整轮次结束时减少天气时间，并推进或结束重大灾害阶段。
 * @param state 当前天气运行时状态。
 * @param disasterCatalog 重大气候灾害静态定义注册表。
 * @param round 当前完成结算的完整轮次。
 * @returns 最新状态、过期天气及灾害阶段变化。
 */
export function advanceWeatherRuntimeAtRoundEnd(
  state: WeatherRuntimeState,
  disasterCatalog: WeatherDisasterDefinitionCatalog,
  round: number,
): AdvanceWeatherRuntimeResult {
  assertPositiveSafeInteger(round, "round");

  if (round <= state.lastAdvancedRound) {
    throw new Error("Weather runtime round must increase");
  }

  const expiredWeathers = state.activeWeathers.filter((weather) => weather.remainingRounds === 1);
  const activeWeathers = state.activeWeathers
    .filter((weather) => weather.remainingRounds > 1)
    .map((weather) => Object.freeze({ ...weather, remainingRounds: weather.remainingRounds - 1 }));
  const previousDisasterPhase = state.activeDisaster?.phase ?? null;
  let activeDisaster = state.activeDisaster;
  let disasterEnded = false;
  let requiresRecoveryDraw = state.requiresRecoveryDraw;

  if (activeDisaster !== null) {
    const definition = disasterCatalog[activeDisaster.weatherId];

    if (definition === undefined) {
      throw new Error(`Unknown active weather disaster: ${activeDisaster.weatherId}`);
    }

    validateWeatherDisasterDefinition(definition);

    if (activeDisaster.remainingPhaseRounds > 1) {
      activeDisaster = Object.freeze({
        ...activeDisaster,
        remainingPhaseRounds: activeDisaster.remainingPhaseRounds - 1,
      });
    } else {
      const nextPhaseIndex = activeDisaster.phaseIndex + 1;
      const nextPhase = definition.phases[nextPhaseIndex];

      if (nextPhase === undefined) {
        activeDisaster = null;
        disasterEnded = true;
        requiresRecoveryDraw = true;
      } else {
        activeDisaster = Object.freeze({
          ...activeDisaster,
          phase: nextPhase.phase,
          phaseIndex: nextPhaseIndex,
          remainingPhaseRounds: nextPhase.rounds,
        });
      }
    }
  }

  const nextState = freezeState({
    activeWeathers,
    activeDisaster,
    requiresRecoveryDraw,
    lastAdvancedRound: round,
  });

  return Object.freeze({
    state: nextState,
    expiredWeathers: Object.freeze(expiredWeathers),
    previousDisasterPhase,
    currentDisasterPhase: activeDisaster?.phase ?? null,
    disasterEnded,
  });
}

/**
 * 方法名：validateWeatherRuntimeState
 * 作用：校验天气实例引用、范围、持续时间、灾害阶段和轮次字段。
 * @param state 需要校验的天气运行时状态。
 * @param weatherCatalog 天气静态定义注册表。
 * @param disasterCatalog 灾害静态定义注册表。
 * @returns 无返回值。
 */
export function validateWeatherRuntimeState(
  state: WeatherRuntimeState,
  weatherCatalog: WeatherDefinitionCatalog,
  disasterCatalog: WeatherDisasterDefinitionCatalog,
): void {
  assertNonNegativeSafeInteger(state.lastAdvancedRound, "lastAdvancedRound");
  const instanceIds = new Set<string>();

  for (const instance of state.activeWeathers) {
    const definition = weatherCatalog[instance.weatherId];

    if (definition === undefined) {
      throw new Error(`Unknown active weather: ${instance.weatherId}`);
    }

    validateWeatherDefinition(definition);
    validateActiveInstance(
      instance,
      instance.sourceType === "EVENT" ? instance.scopeType : definition.scopeType,
      instanceIds,
    );
    assertPositiveSafeInteger(instance.remainingRounds, "remainingRounds");
  }

  if (state.activeDisaster !== null) {
    const definition = disasterCatalog[state.activeDisaster.weatherId];

    if (definition === undefined) {
      throw new Error(`Unknown active weather disaster: ${state.activeDisaster.weatherId}`);
    }

    validateWeatherDisasterDefinition(definition);
    validateActiveInstance(state.activeDisaster, definition.scopeType, instanceIds);
    const phase = definition.phases[state.activeDisaster.phaseIndex];

    if (phase === undefined || phase.phase !== state.activeDisaster.phase) {
      throw new Error("Active weather disaster phase does not match its definition");
    }

    if (state.activeDisaster.remainingPhaseRounds > phase.rounds) {
      throw new Error("Active weather disaster remaining rounds exceed its phase duration");
    }
  }

  if (state.activeDisaster !== null && state.activeWeathers.length > 0) {
    throw new Error("Major weather disasters must replace ordinary active weather");
  }

  if (state.activeDisaster !== null && state.requiresRecoveryDraw) {
    throw new Error("Weather recovery draw cannot be pending during an active disaster");
  }
}

/** 校验活动天气实例的公共字段和作用范围。 */
function validateActiveInstance(
  instance: ActiveWeatherInstance | ActiveWeatherDisasterInstance,
  expectedScopeType: WeatherScopeType,
  instanceIds: Set<string>,
): void {
  assertNonEmptyString(instance.instanceId, "instanceId");
  assertNonEmptyString(instance.sourceId, "sourceId");
  assertPositiveSafeInteger(instance.startedRound, "startedRound");

  if (instanceIds.has(instance.instanceId)) {
    throw new Error(`Duplicate weather instance id: ${instance.instanceId}`);
  }

  instanceIds.add(instance.instanceId);

  if (instance.scopeType !== expectedScopeType) {
    throw new Error(`Weather instance scope does not match definition: ${instance.weatherId}`);
  }

  normalizeScopeTarget(instance.scopeType, instance.scopeTargetId);
}

/** 校验天气实例编号没有被当前状态占用。 */
function assertWeatherInstanceIdAvailable(state: WeatherRuntimeState, instanceId: string): void {
  assertNonEmptyString(instanceId, "instanceId");

  if (
    state.activeWeathers.some((weather) => weather.instanceId === instanceId) ||
    state.activeDisaster?.instanceId === instanceId
  ) {
    throw new Error(`Duplicate weather instance id: ${instanceId}`);
  }
}

/** 校验天气来源与开始轮次。 */
function validateSourceInput(input: {
  readonly sourceId: string;
  readonly startedRound: number;
}): void {
  assertNonEmptyString(input.sourceId, "sourceId");
  assertPositiveSafeInteger(input.startedRound, "startedRound");
}

/** 根据天气范围校验并规范作用目标。 */
function normalizeScopeTarget(
  scopeType: WeatherScopeType,
  scopeTargetId: string | null | undefined,
): string | null {
  if (scopeType === "WORLD") {
    if (scopeTargetId !== null && scopeTargetId !== undefined) {
      throw new Error("World weather must not specify a scope target");
    }

    return null;
  }

  if (scopeTargetId === null || scopeTargetId === undefined) {
    throw new Error(`${scopeType} weather requires a scope target`);
  }

  assertNonEmptyString(scopeTargetId, "scopeTargetId");
  return scopeTargetId;
}

/** 冻结天气运行时状态中的集合。 */
function freezeState(state: WeatherRuntimeState): WeatherRuntimeState {
  return Object.freeze({ ...state, activeWeathers: Object.freeze([...state.activeWeathers]) });
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

/** 校验数值为非负安全整数。 */
function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}
