import type { StandardQuality } from "@genesis-rift/shared";

import type { EventCategory, EventDefinition, EventRevealMode } from "./event-definition.ts";
import type { EventInstance } from "./event-instance.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";
import { createEventOptionAvailabilityMap } from "./event-option-availability.ts";
import { EVENT_REVEAL_ACTIONS, type EventRevealAction } from "./event-runtime-config.ts";

export type { EventRevealAction } from "./event-runtime-config.ts";

/** 描述揭露后允许显示的事件选项基础信息。 */
export interface RevealedEventOptionView {
  readonly optionId: string;
  readonly name: string;
  readonly description: string;
  readonly isAvailable: boolean | null;
}

/** 描述揭露后允许显示的事件结算结构，不包含效果参数与隐藏条件。 */
export type RevealedEventResolutionView =
  | { readonly type: "DIRECT" }
  | {
      readonly type: "CHOICE";
      readonly options: readonly RevealedEventOptionView[];
    };

/** 描述揭露后允许发送给界面的事件内容。 */
export interface RevealedEventContentView {
  readonly eventId: string;
  readonly name: string;
  readonly description: string;
  readonly category: EventCategory;
  readonly rarity: StandardQuality;
  readonly resolution: RevealedEventResolutionView;
}

/** 描述所有事件界面视图共同包含的运行时信息。 */
interface EventViewBase {
  readonly instanceId: string;
  readonly triggeringPlayerId: string | null;
}

/** 描述事件尚未揭露时不包含真实事件内容的界面视图。 */
export interface PendingRevealEventView extends EventViewBase {
  readonly status: "PENDING_REVEAL";
  readonly revealMode: EventRevealMode;
  readonly allowedActions: readonly EventRevealAction[];
}

/** 描述事件揭露后包含公开内容的界面视图。 */
export interface RevealedEventView extends EventViewBase {
  readonly status: "REVEALED";
  readonly content: RevealedEventContentView;
}

/** 描述事件已经锁定结算路线且正在执行效果的界面视图。 */
export interface ResolvingEventView extends EventViewBase {
  readonly status: "RESOLVING";
  readonly selectedOptionId: string | null;
  readonly content: RevealedEventContentView;
}

/** 描述事件效果序列已经执行完成的界面视图。 */
export interface ResolvedEventView extends EventViewBase {
  readonly status: "RESOLVED";
  readonly selectedOptionId: string | null;
  readonly effectOutcomes: readonly string[];
  readonly content: RevealedEventContentView;
}

/** 描述玩家放弃揭露后不包含真实事件内容的界面视图。 */
export interface DeclinedEventView extends EventViewBase {
  readonly status: "DECLINED";
}

/** 描述任意事件状态可以安全发送给界面的数据。 */
export type EventView =
  | PendingRevealEventView
  | RevealedEventView
  | ResolvingEventView
  | ResolvedEventView
  | DeclinedEventView;

/**
 * 方法名：createEventView
 * 作用：根据事件状态和查看玩家创建不泄露隐藏配置的界面视图。
 * @param instance 需要转换的事件运行时实例。
 * @param definition 与事件实例对应的静态定义。
 * @param viewerPlayerId 当前查看事件界面的玩家标识；系统查看时可以为空。
 * @param conditionContext 选项可用性求值上下文；未提供时仅无条件选项显示为可用。
 * @returns 与当前状态匹配的安全事件界面视图。
 * @throws 事件实例与静态定义不匹配时抛出错误。
 */
export function createEventView(
  instance: EventInstance,
  definition: EventDefinition,
  viewerPlayerId: string | null,
  conditionContext?: EventConditionEvaluationContext,
): EventView {
  if (instance.eventId !== definition.eventId) {
    throw new Error(
      `Event instance ${instance.instanceId} does not match definition ${definition.eventId}`,
    );
  }

  if (instance.status === "PENDING_REVEAL") {
    const canDecide =
      definition.revealMode === "OPTIONAL" && viewerPlayerId === instance.triggeringPlayerId;

    return {
      instanceId: instance.instanceId,
      triggeringPlayerId: instance.triggeringPlayerId,
      status: "PENDING_REVEAL",
      revealMode: definition.revealMode,
      allowedActions: canDecide ? EVENT_REVEAL_ACTIONS : [],
    };
  }

  if (instance.status === "DECLINED") {
    return {
      instanceId: instance.instanceId,
      triggeringPlayerId: instance.triggeringPlayerId,
      status: "DECLINED",
    };
  }

  const content = createRevealedEventContentView(definition, conditionContext);

  if (instance.status === "RESOLVING") {
    return {
      instanceId: instance.instanceId,
      triggeringPlayerId: instance.triggeringPlayerId,
      status: "RESOLVING",
      selectedOptionId: instance.selectedOptionId,
      content,
    };
  }

  if (instance.status === "RESOLVED") {
    return {
      instanceId: instance.instanceId,
      triggeringPlayerId: instance.triggeringPlayerId,
      status: "RESOLVED",
      selectedOptionId: instance.selectedOptionId,
      effectOutcomes: instance.effectResults.map((result) => result.outcome),
      content,
    };
  }

  return {
    instanceId: instance.instanceId,
    triggeringPlayerId: instance.triggeringPlayerId,
    status: "REVEALED",
    content,
  };
}

/**
 * 方法名：createRevealedEventContentView
 * 作用：创建不包含效果参数和隐藏条件的已揭露事件内容。
 * @param definition 事件静态定义。
 * @param conditionContext 可选的选项条件求值上下文。
 * @returns 可以安全发送给界面的事件公开内容。
 */
function createRevealedEventContentView(
  definition: EventDefinition,
  conditionContext?: EventConditionEvaluationContext,
): RevealedEventContentView {
  if (definition.resolution.type === "DIRECT") {
    return {
      eventId: definition.eventId,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      rarity: definition.rarity,
      resolution: { type: "DIRECT" },
    };
  }

  const availability =
    conditionContext === undefined
      ? null
      : createEventOptionAvailabilityMap(definition, conditionContext);

  return {
    eventId: definition.eventId,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    rarity: definition.rarity,
    resolution: {
      type: "CHOICE",
      options: definition.resolution.options.map((option) => ({
        optionId: option.optionId,
        name: option.name,
        description: option.description,
        isAvailable:
          option.availabilityCondition === null
            ? true
            : (availability?.get(option.optionId) ?? null),
      })),
    },
  };
}
