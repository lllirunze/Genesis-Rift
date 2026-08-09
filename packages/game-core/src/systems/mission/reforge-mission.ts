import type { PlayerId } from "@genesis-rift/shared";

import { canAffordCoin, spendCoin } from "../economy/index.ts";
import type { PlayerInventoryState } from "../inventory/index.ts";
import { pickWeightedItem, type RandomStream } from "../random/index.ts";

import {
  MISSION_REFORGE_COIN_COSTS,
  MISSION_REFORGE_COIN_REASON_ID,
  type MissionType,
} from "./mission-config.ts";
import {
  collectMissionCandidates,
  type MissionGenerationContext,
} from "./mission-candidate-selection.ts";
import type { MissionDefinition, MissionDefinitionCatalog } from "./mission-definition.ts";
import { replaceInfeasibleMission, type PlayerMissionState } from "./player-mission-state.ts";
import { validateMissionReforgeState, type MissionReforgeState } from "./mission-reforge-state.ts";

/** 描述主动使命重塑因条件不满足而未执行的业务原因。 */
export type MissionReforgeFailureReason =
  | "NOT_OWNER_TURN_START"
  | "MAIN_ACTION_ALREADY_PERFORMED"
  | "RESOLUTION_IN_PROGRESS"
  | "VICTORY_PENDING_OR_CONFIRMED"
  | "MISSION_ALREADY_COMPLETED"
  | "REFORGE_LIMIT_REACHED"
  | "REFORGE_ALREADY_USED_THIS_TURN"
  | "INSUFFICIENT_COIN"
  | "NO_ELIGIBLE_REPLACEMENT";

/** 描述主动使命重塑所需的私有状态、时机和候选生成上下文。 */
export interface ReforgeMissionInput {
  readonly missionState: PlayerMissionState;
  readonly reforgeState: MissionReforgeState;
  readonly inventory: PlayerInventoryState;
  readonly missionId: string;
  readonly catalog: MissionDefinitionCatalog;
  readonly context: MissionGenerationContext;
  readonly randomStream: RandomStream;
  readonly currentTurn: number;
  readonly isOwnerTurnStart: boolean;
  readonly hasPerformedMainAction: boolean;
  readonly isResolutionInProgress: boolean;
  readonly initialProgressByMissionId?: Readonly<Record<string, number>>;
}

/** 描述主动使命重塑成功后的同步状态与元宝支付记录。 */
export interface ReforgedMissionResult {
  readonly outcome: "REFORGED";
  readonly missionState: PlayerMissionState;
  readonly reforgeState: MissionReforgeState;
  readonly inventory: PlayerInventoryState;
  readonly previousMissionId: string;
  readonly replacementMissionId: string;
  readonly coinCost: number;
}

/** 描述主动使命重塑未执行时保持不变的状态与失败原因。 */
export interface RejectedMissionReforgeResult {
  readonly outcome: "REJECTED";
  readonly reason: MissionReforgeFailureReason;
  readonly missionState: PlayerMissionState;
  readonly reforgeState: MissionReforgeState;
  readonly inventory: PlayerInventoryState;
}

/** 主动使命重塑的统一成功或失败结果。 */
export type ReforgeMissionResult = ReforgedMissionResult | RejectedMissionReforgeResult;

/**
 * 方法名：reforgeMission
 * 作用：在玩家回合开始阶段原子完成同类型使命重塑，先生成合法替代使命，再扣除元宝并写入次数记录。
 * @param input 当前使命、重塑、背包状态和生成上下文。
 * @returns 成功时返回同步更新后的状态；失败时返回保持不变的原状态和原因。
 * @throws 状态、静态配置、进度重算值或随机流输入非法时抛出错误。
 */
export function reforgeMission(input: ReforgeMissionInput): ReforgeMissionResult {
  validateMissionReforgeState(input.reforgeState);
  assertMatchingOwner(input);

  const target = input.missionState.missions.find(
    (mission) => mission.missionId === input.missionId,
  );
  if (!input.isOwnerTurnStart) return reject(input, "NOT_OWNER_TURN_START");
  if (input.hasPerformedMainAction) return reject(input, "MAIN_ACTION_ALREADY_PERFORMED");
  if (input.isResolutionInProgress) return reject(input, "RESOLUTION_IN_PROGRESS");
  if (input.missionState.victoryStatus !== "NONE")
    return reject(input, "VICTORY_PENDING_OR_CONFIRMED");
  if (target?.completedAtTurn !== null) return reject(input, "MISSION_ALREADY_COMPLETED");
  if (input.reforgeState.usedCount >= MISSION_REFORGE_COIN_COSTS.length)
    return reject(input, "REFORGE_LIMIT_REACHED");
  if (input.reforgeState.lastUsedTurn === input.currentTurn)
    return reject(input, "REFORGE_ALREADY_USED_THIS_TURN");

  const coinCost = MISSION_REFORGE_COIN_COSTS[input.reforgeState.usedCount]!;
  if (!canAffordCoin(input.inventory, coinCost)) return reject(input, "INSUFFICIENT_COIN");
  if (target === undefined) throw new Error(`Player does not hold mission: ${input.missionId}`);

  const replacement = selectReplacement(input, target.missionId);
  if (replacement === null) return reject(input, "NO_ELIGIBLE_REPLACEMENT");
  const initialProgress = input.initialProgressByMissionId?.[replacement.missionId] ?? 0;
  if (
    !Number.isSafeInteger(initialProgress) ||
    initialProgress < 0 ||
    initialProgress >= replacement.requiredProgress
  ) {
    return reject(input, "NO_ELIGIBLE_REPLACEMENT");
  }

  const payment = spendCoin(input.inventory, {
    coinQuantity: coinCost,
    reasonId: MISSION_REFORGE_COIN_REASON_ID,
  });
  const missionState = replaceInfeasibleMission(
    input.missionState,
    input.catalog,
    target.missionId,
    replacement.missionId,
    "PLAYER_REFORGE",
    input.currentTurn,
    initialProgress,
  );

  return Object.freeze({
    outcome: "REFORGED",
    missionState,
    reforgeState: Object.freeze({
      ownerId: input.reforgeState.ownerId,
      usedCount: input.reforgeState.usedCount + 1,
      lastUsedTurn: input.currentTurn,
      removedMissionIds: Object.freeze([...input.reforgeState.removedMissionIds, target.missionId]),
    }),
    inventory: payment.inventory,
    previousMissionId: target.missionId,
    replacementMissionId: replacement.missionId,
    coinCost,
  });
}

/** 从同类型合法候选中排除现有、历史移除、冲突和已满足使命后按权重抽取。 */
function selectReplacement(
  input: ReforgeMissionInput,
  previousMissionId: string,
): MissionDefinition | null {
  const type = input.catalog[previousMissionId]?.type as MissionType | undefined;
  if (type === undefined) throw new Error(`Unknown mission definition: ${previousMissionId}`);
  const excluded = new Set([
    ...input.missionState.missions.map((mission) => mission.missionId),
    ...input.reforgeState.removedMissionIds,
  ]);
  const otherDefinitions = input.missionState.missions
    .filter((mission) => mission.missionId !== previousMissionId)
    .map((mission) => input.catalog[mission.missionId]!);
  const candidates = collectMissionCandidates(input.catalog, type, input.context).filter(
    (candidate) =>
      !excluded.has(candidate.missionId) &&
      (input.initialProgressByMissionId?.[candidate.missionId] ?? 0) < candidate.requiredProgress &&
      !candidate.conflictTags.some((tag) =>
        otherDefinitions.some((other) => other.conflictTags.includes(tag)),
      ),
  );
  return candidates.length === 0
    ? null
    : pickWeightedItem(
        input.randomStream,
        candidates.map((candidate) => ({ item: candidate, weight: candidate.baseWeight })),
      );
}

/** 创建不修改任何状态的统一失败结果。 */
function reject(
  input: ReforgeMissionInput,
  reason: MissionReforgeFailureReason,
): RejectedMissionReforgeResult {
  return {
    outcome: "REJECTED",
    reason,
    missionState: input.missionState,
    reforgeState: input.reforgeState,
    inventory: input.inventory,
  };
}

/** 校验使命、重塑和背包状态属于同一玩家。 */
function assertMatchingOwner(input: ReforgeMissionInput): void {
  const ownerId: PlayerId = input.missionState.ownerId;
  if (input.reforgeState.ownerId !== ownerId || input.inventory.backpack.playerId !== ownerId)
    throw new Error("Mission reforge states must belong to the same player");
}
