import {
  validateEventConditionExpression,
  type EventAtomicConditionDefinition,
  type EventConditionExpression,
} from "./event-condition-definition.ts";

/** 描述事件条件求值时所需的触发玩家只读信息。 */
export interface EventConditionPlayerContext {
  readonly level: number;
  readonly identityId: string;
  readonly raceId: string;
  readonly faithId: string;
  readonly isInBattle: boolean;
  readonly itemQuantities: ReadonlyMap<string, number>;
  readonly equippedDefinitionIds: ReadonlySet<string>;
  readonly resourceValues: ReadonlyMap<string, number>;
}

/** 描述事件条件求值器从各业务系统接收的标准化只读事实。 */
export interface EventConditionEvaluationContext {
  readonly regionDefinitionId: string | null;
  readonly terrainDefinitionId: string | null;
  readonly featureIds: ReadonlySet<string>;
  readonly weatherId: string | null;
  readonly periodId: string;
  readonly player: EventConditionPlayerContext | null;
  readonly questStages: ReadonlyMap<string, string>;
  readonly dungeonId: string | null;
  readonly worldStateIds: ReadonlySet<string>;
  readonly revealedEventIds: ReadonlySet<string>;
  readonly isFirstVisit: boolean;
}

/**
 * 方法名：evaluateEventConditionExpression
 * 作用：根据标准化只读上下文判断一棵事件条件树是否成立。
 * @param expression 需要求值的事件条件表达式。
 * @param context 从地图、玩家与世界状态聚合得到的只读事实。
 * @returns 条件树成立时返回 true，否则返回 false。
 * @throws 条件表达式配置非法时抛出错误。
 */
export function evaluateEventConditionExpression(
  expression: EventConditionExpression,
  context: EventConditionEvaluationContext,
): boolean {
  validateEventConditionExpression(expression);
  return evaluateExpressionNode(expression, context);
}

/**
 * 方法名：evaluateExpressionNode
 * 作用：递归求值基础条件或逻辑条件组。
 * @param expression 当前需要求值的条件节点。
 * @param context 条件求值使用的标准化只读事实。
 * @returns 当前节点成立时返回 true，否则返回 false。
 */
function evaluateExpressionNode(
  expression: EventConditionExpression,
  context: EventConditionEvaluationContext,
): boolean {
  if (expression.type === "CONDITION") {
    return evaluateAtomicCondition(expression, context);
  }

  if (expression.operator === "ALL") {
    return expression.conditions.every((condition) => evaluateExpressionNode(condition, context));
  }

  return expression.conditions.some((condition) => evaluateExpressionNode(condition, context));
}

/**
 * 方法名：evaluateAtomicCondition
 * 作用：根据条件标识读取上下文中的对应事实并完成基础判断。
 * @param condition 需要求值的基础事件条件。
 * @param context 条件求值使用的标准化只读事实。
 * @returns 基础条件成立时返回 true，否则返回 false。
 */
function evaluateAtomicCondition(
  condition: EventAtomicConditionDefinition,
  context: EventConditionEvaluationContext,
): boolean {
  switch (condition.conditionId) {
    case "map.regionIs":
      return context.regionDefinitionId === condition.parameters.regionDefinitionId;
    case "map.terrainIs":
      return context.terrainDefinitionId === condition.parameters.terrainDefinitionId;
    case "map.featureIs":
      return context.featureIds.has(condition.parameters.featureId);
    case "weather.is":
      return context.weatherId === condition.parameters.weatherId;
    case "time.is":
      return context.periodId === condition.parameters.periodId;
    case "player.levelAtLeast":
      return context.player !== null && context.player.level >= condition.parameters.level;
    case "player.isNotInBattle":
      return context.player !== null && !context.player.isInBattle;
    case "player.identityIs":
      return (
        context.player !== null && context.player.identityId === condition.parameters.identityId
      );
    case "player.raceIs":
      return context.player !== null && context.player.raceId === condition.parameters.raceId;
    case "player.faithIs":
      return context.player !== null && context.player.faithId === condition.parameters.faithId;
    case "quest.stageIs":
      return context.questStages.get(condition.parameters.questId) === condition.parameters.stageId;
    case "dungeon.is":
      return context.dungeonId === condition.parameters.dungeonId;
    case "world.stateIs":
      return context.worldStateIds.has(condition.parameters.stateId);
    case "inventory.hasItem":
      return (
        context.player !== null &&
        (context.player.itemQuantities.get(condition.parameters.itemDefinitionId) ?? 0) >=
          condition.parameters.quantity
      );
    case "equipment.has":
      return (
        context.player !== null &&
        context.player.equippedDefinitionIds.has(condition.parameters.equipmentDefinitionId)
      );
    case "resource.atLeast":
      return (
        context.player !== null &&
        (context.player.resourceValues.get(condition.parameters.resourceId) ?? 0) >=
          condition.parameters.amount
      );
    case "event.wasRevealed":
      return context.revealedEventIds.has(condition.parameters.eventId);
    case "event.wasNotRevealed":
      return !context.revealedEventIds.has(condition.parameters.eventId);
    case "exploration.isFirstVisit":
      return context.isFirstVisit;
  }
}
