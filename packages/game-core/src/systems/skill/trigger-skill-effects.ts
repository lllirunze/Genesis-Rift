import { executeSkillEffects } from "./execute-skill-effects.ts";
import type { SkillDefinitionCatalog } from "./skill-definition.ts";
import type {
  SkillEffectExecutionResult,
  SkillEffectHandlerRegistry,
} from "./skill-effect-handler.ts";
import { getSkillDefinition, type CharacterSkillState } from "./skill-runtime-state.ts";
import type { SkillTriggerEventType } from "./skill-config.ts";

/** 描述一次统一技能通知提供的触发时机与参与者事实。 */
export interface SkillTriggerNotification {
  readonly eventId: string;
  readonly eventType: SkillTriggerEventType;
  readonly sourceId: string | null;
  readonly targetIds: readonly string[];
}

/** 描述一项被动或触发技能完成效果执行后的结果。 */
export interface TriggeredSkillExecutionResult {
  readonly definitionId: string;
  readonly effectResults: readonly SkillEffectExecutionResult[];
}

/**
 * 方法名：executeTriggeredSkillEffects
 * 作用：按已掌握技能顺序执行订阅当前业务时机的被动与触发技能效果。
 * @param skillState 角色当前已掌握技能及运行时限制状态。
 * @param definitions 技能静态定义注册表。
 * @param notification 当前统一业务通知。
 * @param registry 已注册的技能效果处理器集合。
 * @returns 已执行技能及其效果结果的不可变列表。
 * @throws 通知字段非法、技能资源缺失或效果处理器未注册时抛出错误。
 */
export function executeTriggeredSkillEffects(
  skillState: CharacterSkillState,
  definitions: SkillDefinitionCatalog,
  notification: SkillTriggerNotification,
  registry: SkillEffectHandlerRegistry,
): readonly TriggeredSkillExecutionResult[] {
  validateNotification(notification);
  const results: TriggeredSkillExecutionResult[] = [];

  for (const entry of Object.values(skillState.entries)) {
    const definition = getSkillDefinition(definitions, entry.definitionId);

    if (
      definition.type === "active" ||
      !definition.triggerEventTypes?.includes(notification.eventType)
    ) {
      continue;
    }

    const effectResults = executeSkillEffects(
      definition,
      {
        executionId: `${notification.eventId}:${definition.definitionId}`,
        casterId: skillState.ownerId,
        targetIds: notification.targetIds,
      },
      registry,
    );
    results.push(Object.freeze({ definitionId: definition.definitionId, effectResults }));
  }

  return Object.freeze(results);
}

/** 校验统一技能通知的标识与目标集合。 */
function validateNotification(notification: SkillTriggerNotification): void {
  assertNonEmptyString(notification.eventId, "eventId");

  if (notification.sourceId !== null) {
    assertNonEmptyString(notification.sourceId, "sourceId");
  }

  const targetIds = new Set<string>();
  for (const targetId of notification.targetIds) {
    assertNonEmptyString(targetId, "targetIds");

    if (targetIds.has(targetId)) {
      throw new Error(`Duplicate skill trigger target id: ${targetId}`);
    }

    targetIds.add(targetId);
  }
}

/** 校验字符串为非空内容。 */
function assertNonEmptyString(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}
