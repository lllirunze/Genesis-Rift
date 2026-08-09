import {
  createDeathRelicFromDeath,
  type CreateDeathRelicFromDeathInput,
  type CreateDeathRelicFromDeathResult,
} from "./create-death-relic-from-death.ts";
import { addDeathRelic, type DeathRelicRuntimeState } from "./death-relic-runtime-state.ts";

/** 描述角色正式死亡时生成遗物并登记到公共运行时容器的输入。 */
export interface CreateDeathRelicInRuntimeInput extends CreateDeathRelicFromDeathInput {
  readonly runtimeState: DeathRelicRuntimeState;
}

/** 描述正式死亡结算后，遗物已登记至公共容器的完整结果。 */
export interface CreateDeathRelicInRuntimeResult extends CreateDeathRelicFromDeathResult {
  readonly runtimeState: DeathRelicRuntimeState;
}

/**
 * 方法名：createDeathRelicInRuntime
 * 作用：将正式死亡的遗物生成与公共运行时容器登记合并为单一入口，避免遗漏地图交互注册。
 * @param input 死亡角色状态、遗物标识、死亡格、随机流、静态物品定义与当前遗物容器。
 * @returns 已更新背包、装备栏和已包含新遗物包的公共运行时状态。
 * @throws 死亡损失结算或遗物标识重复时抛出错误。
 */
export function createDeathRelicInRuntime(
  input: CreateDeathRelicInRuntimeInput,
): CreateDeathRelicInRuntimeResult {
  const result = createDeathRelicFromDeath(input);

  return Object.freeze({
    ...result,
    runtimeState: addDeathRelic(input.runtimeState, result.relic),
  });
}
