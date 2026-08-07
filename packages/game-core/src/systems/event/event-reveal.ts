import type { EventDefinition } from "./event-definition.ts";
import {
  validateEventInstance,
  type DeclinedEventInstance,
  type PendingRevealEventInstance,
  type RevealedEventInstance,
} from "./event-instance.ts";
import { EVENT_REVEAL_ACTIONS, type EventRevealAction } from "./event-runtime-config.ts";
import type { RevealedEventOccurrence } from "./select-event-candidate.ts";

/** 描述玩家处理可选择揭露事件所需的输入。 */
export interface DecideOptionalEventRevealInput {
  readonly actingPlayerId: string;
  readonly action: EventRevealAction;
  readonly decidedAtTurn: number;
}

/**
 * 方法名：revealForcedEvent
 * 作用：将强制揭露事件从待揭露状态自动迁移为已揭露状态。
 * @param instance 需要处理的待揭露事件实例。
 * @param definition 与事件实例对应的静态定义。
 * @param revealedAtTurn 自动揭露发生的回合。
 * @returns 完成状态迁移的已揭露事件实例。
 * @throws 定义不匹配、事件不是强制揭露或回合非法时抛出错误。
 */
export function revealForcedEvent(
  instance: PendingRevealEventInstance,
  definition: EventDefinition,
  revealedAtTurn: number,
): RevealedEventInstance {
  validateRevealTransition(instance, definition, revealedAtTurn);

  if (definition.revealMode !== "FORCED") {
    throw new Error("Only forced reveal events can use automatic reveal");
  }

  return {
    ...instance,
    status: "REVEALED",
    revealedAtTurn,
  };
}

/**
 * 方法名：decideOptionalEventReveal
 * 作用：由事件触发玩家决定揭露或放弃可选择揭露事件。
 * @param instance 需要处理的待揭露事件实例。
 * @param definition 与事件实例对应的静态定义。
 * @param input 操作玩家、揭露决定与决定回合。
 * @returns 已揭露或已放弃的事件实例。
 * @throws 定义、揭露模式、操作玩家或回合不合法时抛出错误。
 */
export function decideOptionalEventReveal(
  instance: PendingRevealEventInstance,
  definition: EventDefinition,
  input: DecideOptionalEventRevealInput,
): RevealedEventInstance | DeclinedEventInstance {
  validateRevealTransition(instance, definition, input.decidedAtTurn);

  if (definition.revealMode !== "OPTIONAL") {
    throw new Error("Only optional reveal events accept player reveal decisions");
  }

  if (input.actingPlayerId.trim().length === 0) {
    throw new TypeError("actingPlayerId must not be empty");
  }

  if (input.actingPlayerId !== instance.triggeringPlayerId) {
    throw new Error("Only the triggering player can decide optional event reveal");
  }

  if (!EVENT_REVEAL_ACTIONS.includes(input.action)) {
    throw new RangeError(`Unsupported event reveal action: ${String(input.action)}`);
  }

  if (input.action === "REVEAL") {
    return {
      ...instance,
      status: "REVEALED",
      revealedAtTurn: input.decidedAtTurn,
    };
  }

  return {
    ...instance,
    status: "DECLINED",
    declinedAtTurn: input.decidedAtTurn,
  };
}

/**
 * 方法名：createRevealedEventOccurrence
 * 作用：将已揭露实例转换为可供唯一性与冷却筛选使用的历史记录。
 * @param instance 已完成揭露的事件实例。
 * @returns 只包含揭露事实的事件历史记录。
 */
export function createRevealedEventOccurrence(
  instance: RevealedEventInstance,
): RevealedEventOccurrence {
  validateEventInstance(instance);

  return {
    eventId: instance.eventId,
    triggeringPlayerId: instance.triggeringPlayerId,
    revealedAtTurn: instance.revealedAtTurn,
  };
}

/**
 * 方法名：validateRevealTransition
 * 作用：校验事件定义匹配关系及状态迁移回合。
 * @param instance 需要迁移的待揭露事件实例。
 * @param definition 与事件实例对应的静态定义。
 * @param transitionTurn 状态迁移发生的回合。
 * @returns 无返回值。
 * @throws 实例、定义或迁移回合非法时抛出错误。
 */
function validateRevealTransition(
  instance: PendingRevealEventInstance,
  definition: EventDefinition,
  transitionTurn: number,
): void {
  const runtimeStatus = (instance as unknown as { readonly status: string }).status;

  if (runtimeStatus !== "PENDING_REVEAL") {
    throw new Error(`Event instance must be PENDING_REVEAL, received ${runtimeStatus}`);
  }

  validateEventInstance(instance);

  if (instance.eventId !== definition.eventId) {
    throw new Error(
      `Event instance ${instance.instanceId} does not match definition ${definition.eventId}`,
    );
  }

  if (!Number.isSafeInteger(transitionTurn) || transitionTurn < instance.triggeredAtTurn) {
    throw new RangeError("Reveal transition turn must not be earlier than the trigger turn");
  }
}
