import type { QuestDefinitionCatalog } from "./quest-definition.ts";
import {
  ALWAYS_SATISFIED_QUEST_CONDITION_EVALUATOR,
  areQuestConditionsSatisfied,
  type QuestConditionContext,
  type QuestConditionEvaluator,
} from "./quest-condition.ts";
import { offerQuest, type PlayerQuestState } from "./quest-runtime-state.ts";

/** 描述 NPC、事件、地点等系统向任务系统发出的统一任务提供指令。 */
export interface QuestOfferInstruction {
  readonly questInstanceId: string;
  readonly ownerId: string;
  readonly questId: string;
  readonly sourceType: "NPC" | "LOCATION" | "EVENT" | "BATTLE" | "SYSTEM";
  readonly sourceId: string | null;
}

/**
 * 方法名：applyQuestOfferInstruction
 * 作用：校验来源与玩家归属后，将其他系统发出的任务提供指令写入玩家任务栏。
 * @param state 当前玩家任务栏。
 * @param catalog 已校验的任务静态定义注册表。
 * @param instruction 由 NPC、地点、事件或其他系统创建的任务提供指令。
 * @param conditionContext 当前玩家与回合的任务条件上下文。
 * @param conditionEvaluator 负责读取外部条件状态的判断器。
 * @returns 包含新的可领取任务的不可变玩家任务栏。
 * @throws 指令玩家与任务栏不匹配，或来源信息非法时抛出错误。
 */
export function applyQuestOfferInstruction(
  state: PlayerQuestState,
  catalog: QuestDefinitionCatalog,
  instruction: QuestOfferInstruction,
  conditionContext: QuestConditionContext = { ownerId: state.ownerId, currentTurn: 0 },
  conditionEvaluator: QuestConditionEvaluator = ALWAYS_SATISFIED_QUEST_CONDITION_EVALUATOR,
): PlayerQuestState {
  if (instruction.ownerId !== state.ownerId) {
    throw new Error("Quest offer owner must match the quest state owner");
  }

  assertNonEmptyString(instruction.questInstanceId, "questInstanceId");
  assertNonEmptyString(instruction.questId, "questId");
  validateSource(instruction.sourceType, instruction.sourceId);
  const definition = catalog[instruction.questId];

  if (definition === undefined) {
    throw new Error(`Unknown quest definition: ${instruction.questId}`);
  }

  if (
    definition.issuerType !== instruction.sourceType ||
    definition.issuerId !== instruction.sourceId
  ) {
    throw new Error("Quest offer source must match the quest definition issuer");
  }

  if (conditionContext.ownerId !== state.ownerId) {
    throw new Error("Quest condition owner must match the quest state owner");
  }

  if (
    !areQuestConditionsSatisfied(
      definition.triggerConditionIds,
      conditionEvaluator,
      conditionContext,
    )
  ) {
    throw new Error(`Quest trigger conditions are not satisfied: ${instruction.questId}`);
  }

  return offerQuest(state, catalog, instruction.questInstanceId, instruction.questId);
}

/** 校验任务提供来源与来源标识之间的必填关系。 */
function validateSource(
  sourceType: QuestOfferInstruction["sourceType"],
  sourceId: string | null,
): void {
  if (sourceType !== "SYSTEM" && sourceId === null) {
    throw new Error("Non-system quest offers must define a source id");
  }

  if (sourceId !== null) {
    assertNonEmptyString(sourceId, "sourceId");
  }
}

/** 校验字符串不为空。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
