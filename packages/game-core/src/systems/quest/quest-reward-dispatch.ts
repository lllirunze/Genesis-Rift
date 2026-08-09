import type { QuestRewardInstruction } from "./quest-runtime-state.ts";

/** 声明任务奖励可以分发到的业务系统通道。 */
export const QUEST_REWARD_DISPATCH_CHANNELS = [
  "ECONOMY",
  "LEVEL",
  "HAND",
  "INVENTORY",
  "ATTRIBUTE",
  "INFORMATION",
  "PERMISSION",
  "STORY",
] as const;

/** 描述任务奖励下游分发的目标系统通道。 */
export type QuestRewardDispatchChannel = (typeof QUEST_REWARD_DISPATCH_CHANNELS)[number];

/** 描述任务奖励交给下游系统执行时使用的不可变分发指令。 */
export interface QuestRewardDispatchInstruction {
  readonly channel: QuestRewardDispatchChannel;
  readonly reward: QuestRewardInstruction;
}

/** 描述特定奖励通道对游戏运行时状态执行奖励的处理器。 */
export interface QuestRewardDispatchHandler<State> {
  readonly channel: QuestRewardDispatchChannel;
  execute(state: State, reward: QuestRewardInstruction): State;
}

/** 描述以奖励分发通道索引的处理器注册表。 */
export type QuestRewardHandlerRegistry<State> = Readonly<
  Partial<Record<QuestRewardDispatchChannel, QuestRewardDispatchHandler<State>>>
>;

/**
 * 方法名：createQuestRewardDispatchInstructions
 * 作用：将任务奖励转换为元宝、经验、手牌、背包等下游系统可独立消费的分发指令。
 * @param rewards 已领取任务产生的中立奖励指令。
 * @returns 按原奖励顺序排列的不可变分发指令。
 */
export function createQuestRewardDispatchInstructions(
  rewards: readonly QuestRewardInstruction[],
): readonly QuestRewardDispatchInstruction[] {
  return Object.freeze(
    rewards.map((reward) => Object.freeze({ channel: getRewardDispatchChannel(reward), reward })),
  );
}

/**
 * 方法名：executeQuestRewardDispatchInstructions
 * 作用：按奖励原始顺序调用对应通道处理器，完成由上层注入的实际奖励状态更新。
 * @param state 当前游戏或玩家聚合状态。
 * @param instructions 已从任务奖励生成的分发指令。
 * @param registry 提供元宝、经验、手牌、物品等实际处理逻辑的注册表。
 * @returns 所有奖励处理完成后的新状态。
 * @throws 任一奖励通道未注册处理器时抛出错误，避免静默丢失奖励。
 */
export function executeQuestRewardDispatchInstructions<State>(
  state: State,
  instructions: readonly QuestRewardDispatchInstruction[],
  registry: QuestRewardHandlerRegistry<State>,
): State {
  let nextState = state;

  for (const instruction of instructions) {
    const handler = registry[instruction.channel];

    if (handler === undefined) {
      throw new Error(`Missing quest reward handler for channel: ${instruction.channel}`);
    }

    if (handler.channel !== instruction.channel) {
      throw new Error(`Quest reward handler channel mismatch: ${instruction.channel}`);
    }

    nextState = handler.execute(nextState, instruction.reward);
  }

  return nextState;
}

/** 将单项奖励分类映射到唯一的下游业务通道。 */
function getRewardDispatchChannel(reward: QuestRewardInstruction): QuestRewardDispatchChannel {
  switch (reward.type) {
    case "COIN":
      return "ECONOMY";
    case "EXPERIENCE":
      return "LEVEL";
    case "HAND_CARD":
      return "HAND";
    case "ITEM":
      return "INVENTORY";
    case "ATTRIBUTE_POINT":
      return "ATTRIBUTE";
    case "INFORMATION":
      return "INFORMATION";
    case "SPECIAL_PERMISSION":
      return "PERMISSION";
    case "STORY":
      return "STORY";
  }
}
