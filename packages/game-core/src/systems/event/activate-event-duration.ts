import type { EventDefinition } from "./event-definition.ts";
import type {
  ActiveEventDurationInstance,
  EndedEventDurationInstance,
  EventDurationEndInstruction,
} from "./event-duration-instance.ts";
import { validateActiveEventDurationInstance } from "./event-duration-instance.ts";
import type { ResolvedEventInstance } from "./event-instance.ts";
import { validateEventInstance } from "./event-instance.ts";

/** 描述持续事件首次激活或重复触发时所需的输入。 */
export interface ActivateEventDurationInput {
  readonly durationInstanceId: string;
  readonly activatedAtTurn: number;
  readonly activatedAtSequence: number;
}

/** 描述持续事件激活或重复策略处理后的结果类别。 */
export type ActivateEventDurationOutcome =
  "IMMEDIATE" | "CREATED" | "IGNORED" | "REFRESHED" | "REPLACED" | "STACK_LIMIT_REACHED";

/** 描述一次持续事件激活操作产生的完整状态变化。 */
export interface ActivateEventDurationResult {
  readonly outcome: ActivateEventDurationOutcome;
  readonly activeInstances: readonly ActiveEventDurationInstance[];
  readonly activatedInstance: ActiveEventDurationInstance | null;
  readonly endedInstances: readonly EndedEventDurationInstance[];
  readonly endInstructions: readonly EventDurationEndInstruction[];
}

/**
 * 方法名：activateEventDuration
 * 作用：根据事件持续定义与重复策略创建、刷新、替换或忽略运行时实例。
 * @param activeInstances 当前全部生效中的持续事件实例。
 * @param resolvedEvent 已完成初次效果结算的事件实例。
 * @param definition 与已结算事件对应的静态定义。
 * @param input 新持续实例标识及激活时序。
 * @returns 激活结果、最新实例集合及需要清理的旧实例。
 * @throws 输入实例、定义、标识或时序非法时抛出错误。
 */
export function activateEventDuration(
  activeInstances: readonly ActiveEventDurationInstance[],
  resolvedEvent: ResolvedEventInstance,
  definition: EventDefinition,
  input: ActivateEventDurationInput,
): ActivateEventDurationResult {
  validateActivationInput(activeInstances, resolvedEvent, definition, input);

  if (definition.duration.type === "IMMEDIATE") {
    return createActivationResult("IMMEDIATE", activeInstances, null, [], []);
  }

  const matchingInstances = activeInstances.filter(
    (instance) => instance.eventId === definition.eventId,
  );
  const repeat = definition.duration.repeat;

  if (repeat.policy !== "STACK" && matchingInstances.length > 1) {
    throw new Error(`Non-stacking event has multiple active durations: ${definition.eventId}`);
  }

  if (
    matchingInstances.some((instance) => input.activatedAtSequence <= instance.lastUpdateSequence)
  ) {
    throw new Error("Duration activation sequence must follow the existing instance update");
  }

  if (matchingInstances.length > 0 && repeat.policy === "IGNORE") {
    return createActivationResult("IGNORED", activeInstances, null, [], []);
  }

  if (matchingInstances.length > 0 && repeat.policy === "REFRESH") {
    const current = matchingInstances[0]!;

    if (current.durationType !== "FIXED_ROUNDS" || definition.duration.type !== "FIXED_ROUNDS") {
      throw new Error("Only fixed-round event durations can be refreshed");
    }

    const refreshed: ActiveEventDurationInstance = {
      ...current,
      latestSourceEventInstanceId: resolvedEvent.instanceId,
      remainingRounds: definition.duration.rounds,
      lastUpdateSequence: input.activatedAtSequence,
    };

    return createActivationResult(
      "REFRESHED",
      replaceInstance(activeInstances, refreshed),
      refreshed,
      [],
      [],
    );
  }

  if (matchingInstances.length > 0 && repeat.policy === "REPLACE") {
    const ended = matchingInstances.map((instance) =>
      endDurationInstance(instance, input.activatedAtTurn, input.activatedAtSequence, "REPLACED"),
    );
    const retained = activeInstances.filter((instance) => instance.eventId !== definition.eventId);
    const activated = createActiveInstance(resolvedEvent, definition, input);

    return createActivationResult(
      "REPLACED",
      [...retained, activated],
      activated,
      ended,
      ended.map(createEndInstruction),
    );
  }

  if (repeat.policy === "STACK" && matchingInstances.length >= repeat.maximumInstances) {
    return createActivationResult("STACK_LIMIT_REACHED", activeInstances, null, [], []);
  }

  const activated = createActiveInstance(resolvedEvent, definition, input);

  return createActivationResult("CREATED", [...activeInstances, activated], activated, [], []);
}

/**
 * 方法名：createActiveInstance
 * 作用：根据非即时持续定义创建对应判别联合实例。
 * @param resolvedEvent 已完成初次结算的事件实例。
 * @param definition 事件静态定义。
 * @param input 持续实例标识与激活时序。
 * @returns 新创建的持续事件实例。
 */
function createActiveInstance(
  resolvedEvent: ResolvedEventInstance,
  definition: EventDefinition,
  input: ActivateEventDurationInput,
): ActiveEventDurationInstance {
  const base = {
    durationInstanceId: input.durationInstanceId,
    eventId: definition.eventId,
    sourceEventInstanceId: resolvedEvent.instanceId,
    latestSourceEventInstanceId: resolvedEvent.instanceId,
    triggeringPlayerId: resolvedEvent.triggeringPlayerId,
    startedAtTurn: input.activatedAtTurn,
    startedAtSequence: input.activatedAtSequence,
    lastUpdateSequence: input.activatedAtSequence,
  };

  switch (definition.duration.type) {
    case "FIXED_ROUNDS":
      return { ...base, durationType: "FIXED_ROUNDS", remainingRounds: definition.duration.rounds };
    case "UNTIL_CONDITION":
      return { ...base, durationType: "UNTIL_CONDITION" };
    case "UNTIL_WORLD_EVENT_END":
      return { ...base, durationType: "UNTIL_WORLD_EVENT_END" };
    case "PERMANENT":
      return { ...base, durationType: "PERMANENT" };
    case "IMMEDIATE":
      throw new Error("Immediate events do not create duration instances");
  }
}

/**
 * 方法名：endDurationInstance
 * 作用：将被替换的活动实例转换为统一结束记录。
 * @param instance 需要结束的活动实例。
 * @param endedAtTurn 结束发生的游戏回合。
 * @param endedAtSequence 结束发生的全局顺序值。
 * @param reason 持续效果结束原因。
 * @returns 可供日志和外部清理使用的结束记录。
 */
function endDurationInstance(
  instance: ActiveEventDurationInstance,
  endedAtTurn: number,
  endedAtSequence: number,
  reason: EndedEventDurationInstance["reason"],
): EndedEventDurationInstance {
  return {
    durationInstanceId: instance.durationInstanceId,
    eventId: instance.eventId,
    sourceEventInstanceId: instance.sourceEventInstanceId,
    latestSourceEventInstanceId: instance.latestSourceEventInstanceId,
    triggeringPlayerId: instance.triggeringPlayerId,
    durationType: instance.durationType,
    startedAtTurn: instance.startedAtTurn,
    endedAtTurn,
    endedAtSequence,
    reason,
  };
}

/**
 * 方法名：createEndInstruction
 * 作用：从结束记录生成不包含静态实现细节的外部效果清理指令。
 * @param ended 已结束的持续事件记录。
 * @returns 供天气、地图等系统消费的清理指令。
 */
function createEndInstruction(ended: EndedEventDurationInstance): EventDurationEndInstruction {
  return {
    durationInstanceId: ended.durationInstanceId,
    eventId: ended.eventId,
    reason: ended.reason,
  };
}

/**
 * 方法名：replaceInstance
 * 作用：以相同持续实例标识替换集合中的旧运行时值。
 * @param instances 当前活动实例集合。
 * @param replacement 刷新后的持续实例。
 * @returns 保持原顺序的新活动实例集合。
 */
function replaceInstance(
  instances: readonly ActiveEventDurationInstance[],
  replacement: ActiveEventDurationInstance,
): readonly ActiveEventDurationInstance[] {
  return instances.map((instance) =>
    instance.durationInstanceId === replacement.durationInstanceId ? replacement : instance,
  );
}

/**
 * 方法名：validateActivationInput
 * 作用：校验事件、定义、持续实例标识及激活时序的一致性。
 * @param activeInstances 当前活动实例集合。
 * @param resolvedEvent 已完成结算的事件实例。
 * @param definition 事件静态定义。
 * @param input 激活操作输入。
 * @returns 无返回值。
 * @throws 输入不满足持续事件激活约束时抛出错误。
 */
function validateActivationInput(
  activeInstances: readonly ActiveEventDurationInstance[],
  resolvedEvent: ResolvedEventInstance,
  definition: EventDefinition,
  input: ActivateEventDurationInput,
): void {
  validateEventInstance(resolvedEvent);

  if (resolvedEvent.eventId !== definition.eventId) {
    throw new Error("Resolved event instance does not match duration definition");
  }

  if (input.durationInstanceId.trim().length === 0) {
    throw new TypeError("durationInstanceId must not be empty");
  }

  const existingDurationInstanceIds = new Set<string>();

  for (const instance of activeInstances) {
    validateActiveEventDurationInstance(instance);

    if (existingDurationInstanceIds.has(instance.durationInstanceId)) {
      throw new Error(`Duplicate active event duration id: ${instance.durationInstanceId}`);
    }

    existingDurationInstanceIds.add(instance.durationInstanceId);
  }

  if (activeInstances.some((item) => item.durationInstanceId === input.durationInstanceId)) {
    throw new Error(`Duplicate event duration instance id: ${input.durationInstanceId}`);
  }

  if (!Number.isSafeInteger(input.activatedAtTurn) || input.activatedAtTurn <= 0) {
    throw new RangeError("activatedAtTurn must be a positive safe integer");
  }

  if (input.activatedAtTurn < resolvedEvent.resolvedAtTurn) {
    throw new RangeError("activatedAtTurn must not be earlier than resolvedAtTurn");
  }

  if (activeInstances.some((instance) => input.activatedAtTurn < instance.startedAtTurn)) {
    throw new RangeError("activatedAtTurn must not precede an existing duration start");
  }

  if (!Number.isSafeInteger(input.activatedAtSequence) || input.activatedAtSequence < 0) {
    throw new RangeError("activatedAtSequence must be a valid non-negative sequence");
  }
}

/**
 * 方法名：createActivationResult
 * 作用：冻结持续事件激活操作返回的集合，避免调用方修改运行时结果。
 * @param outcome 激活操作结果类别。
 * @param activeInstances 最新活动实例集合。
 * @param activatedInstance 新建或刷新的实例。
 * @param endedInstances 本次被替换结束的实例。
 * @param endInstructions 本次需要外部系统执行的清理指令。
 * @returns 完整且只读的持续事件激活结果。
 */
function createActivationResult(
  outcome: ActivateEventDurationOutcome,
  activeInstances: readonly ActiveEventDurationInstance[],
  activatedInstance: ActiveEventDurationInstance | null,
  endedInstances: readonly EndedEventDurationInstance[],
  endInstructions: readonly EventDurationEndInstruction[],
): ActivateEventDurationResult {
  return Object.freeze({
    outcome,
    activeInstances: Object.freeze([...activeInstances]),
    activatedInstance,
    endedInstances: Object.freeze([...endedInstances]),
    endInstructions: Object.freeze([...endInstructions]),
  });
}
