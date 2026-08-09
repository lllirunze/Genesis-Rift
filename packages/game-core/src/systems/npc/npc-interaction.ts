import type { TileId } from "@genesis-rift/shared";

import { NPC_INTERACTION_INELIGIBILITY_REASONS } from "./npc-config.ts";
import {
  getNpcServiceDefinition,
  type NpcDefinition,
  type NpcServiceType,
} from "./npc-definition.ts";
import type { NpcRuntimeState } from "./npc-runtime-state.ts";

/** 描述 NPC 交互可能产生的失败原因。 */
export type NpcInteractionIneligibilityReason =
  (typeof NPC_INTERACTION_INELIGIBILITY_REASONS)[number];

/** 描述玩家尝试使用某项 NPC 服务时需要提供的位置与服务类型。 */
export interface NpcInteractionInput {
  readonly playerTileId: TileId;
  readonly serviceType: NpcServiceType;
  readonly environmentTags: readonly string[];
}

/** 描述玩家是否可以开始 NPC 服务交互。 */
export type NpcInteractionEligibilityResult =
  | { readonly allowed: true; readonly reason: null }
  | { readonly allowed: false; readonly reason: NpcInteractionIneligibilityReason };

/**
 * 方法名：evaluateNpcInteractionEligibility
 * 作用：检查 NPC 是否可用、是否提供目标服务、玩家位置及公开环境标签是否满足要求。
 * @param definition NPC 静态定义。
 * @param state NPC 当前运行时位置与可用状态。
 * @param input 玩家位置、准备使用的服务类型与当前公开环境标签。
 * @returns 允许交互或首个稳定失败原因。
 * @throws NPC 静态定义与运行时状态不匹配时抛出错误。
 */
export function evaluateNpcInteractionEligibility(
  definition: NpcDefinition,
  state: NpcRuntimeState,
  input: NpcInteractionInput,
): NpcInteractionEligibilityResult {
  if (definition.definitionId !== state.definitionId) {
    throw new Error("NPC runtime state does not match NPC definition");
  }

  if (!state.available) {
    return { allowed: false, reason: "NPC_UNAVAILABLE" };
  }

  const service = getNpcServiceDefinition(definition, input.serviceType);

  if (service === null) {
    return { allowed: false, reason: "SERVICE_UNAVAILABLE" };
  }

  if (state.currentTileId !== input.playerTileId) {
    return { allowed: false, reason: "OUT_OF_RANGE" };
  }

  validateEnvironmentTags(input.environmentTags);
  if (!service.requiredEnvironmentTags.every((tag) => input.environmentTags.includes(tag))) {
    return { allowed: false, reason: "ENVIRONMENT_UNAVAILABLE" };
  }

  return { allowed: true, reason: null };
}

/** 校验运行时公开环境标签均非空且不重复。 */
function validateEnvironmentTags(environmentTags: readonly string[]): void {
  const tags = new Set<string>();

  for (const tag of environmentTags) {
    if (typeof tag !== "string" || tag.trim().length === 0) {
      throw new TypeError("environmentTags must contain non-empty strings");
    }
    if (tags.has(tag)) {
      throw new Error(`environmentTags cannot contain duplicates: ${tag}`);
    }

    tags.add(tag);
  }
}
