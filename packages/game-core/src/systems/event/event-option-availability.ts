import type { EventDefinition } from "./event-definition.ts";
import type { EventResolutionDefinition } from "./event-resolution-definition.ts";
import type { EventConditionEvaluationContext } from "./evaluate-event-condition.ts";
import { evaluateEventConditionExpression } from "./evaluate-event-condition.ts";

/** 描述单个事件选项在当前上下文中的可用状态。 */
export interface EventOptionAvailability {
  readonly optionId: string;
  readonly isAvailable: boolean;
}

/** 描述以选项标识索引的只读可用状态。 */
export type EventOptionAvailabilityMap = ReadonlyMap<string, boolean>;

/**
 * 方法名：evaluateEventOptionAvailability
 * 作用：根据事件条件上下文计算所有玩家选项当前是否可用。
 * @param definition 已经揭露的事件静态定义。
 * @param context 从玩家、地图和世界状态聚合得到的只读事实。
 * @returns 按静态定义顺序排列的选项可用状态。
 * @throws 直接结算事件不包含玩家选项时抛出错误。
 */
export function evaluateEventOptionAvailability(
  definition: EventDefinition,
  context: EventConditionEvaluationContext,
): readonly EventOptionAvailability[] {
  const resolution = requireChoiceResolution(definition.resolution);

  return Object.freeze(
    resolution.options.map((option) =>
      Object.freeze({
        optionId: option.optionId,
        isAvailable:
          option.availabilityCondition === null ||
          evaluateEventConditionExpression(option.availabilityCondition, context),
      }),
    ),
  );
}

/**
 * 方法名：createEventOptionAvailabilityMap
 * 作用：将选项可用状态转换为便于按标识查询的只读映射。
 * @param definition 已经揭露的事件静态定义。
 * @param context 从玩家、地图和世界状态聚合得到的只读事实。
 * @returns 选项标识与可用状态组成的只读映射。
 */
export function createEventOptionAvailabilityMap(
  definition: EventDefinition,
  context: EventConditionEvaluationContext,
): EventOptionAvailabilityMap {
  return new Map(
    evaluateEventOptionAvailability(definition, context).map((item) => [
      item.optionId,
      item.isAvailable,
    ]),
  );
}

/**
 * 方法名：requireChoiceResolution
 * 作用：读取选项型结算定义并拒绝直接结算事件。
 * @param resolution 事件静态结算定义。
 * @returns 选项型事件结算定义。
 * @throws 输入不是选项型结算时抛出错误。
 */
function requireChoiceResolution(
  resolution: EventResolutionDefinition,
): Extract<EventResolutionDefinition, { readonly type: "CHOICE" }> {
  if (resolution.type !== "CHOICE") {
    throw new Error("Direct event resolutions do not contain player options");
  }

  return resolution;
}
