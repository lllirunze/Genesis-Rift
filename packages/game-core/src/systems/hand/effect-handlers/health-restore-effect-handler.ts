import { increaseCharacterResource, type CharacterResourceState } from "../../character/index.ts";
import type { HandCardEffectHandler } from "../hand-card-effect-handler.ts";
import { getPlayerEffectTargetIds } from "./player-effect-targets.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface HealthRestoreEffectHandlerDependencies {
  readonly healthResourceId: string;
  readonly getCharacterResourceState: (
    targetPlayerId: string,
  ) => CharacterResourceState<string> | null;
  readonly saveCharacterResourceState: (state: CharacterResourceState<string>) => void;
}

/** 描述业务操作完成后返回的结果。 */
export interface HealthRestoreTargetResult {
  readonly targetPlayerId: string;
  readonly state: CharacterResourceState<string>;
  readonly requestedAmount: number;
  readonly restoredAmount: number;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface HealthRestoreEffectOutput {
  readonly targets: readonly HealthRestoreTargetResult[];
}

/**
 * 方法名：createHealthRestoreEffectHandler
 * 作用：创建并校验该方法所负责的业务对象。
 * @param dependencies 方法所需的 dependencies 参数。
 * @returns 本次处理得到的结果。
 */
export function createHealthRestoreEffectHandler(
  dependencies: HealthRestoreEffectHandlerDependencies,
): HandCardEffectHandler<"health.restore", HealthRestoreEffectOutput> {
  assertNonEmptyString(dependencies.healthResourceId, "healthResourceId");

  return {
    effectId: "health.restore",
    /**
     * 方法名：execute
     * 作用：执行该方法负责的业务规则并返回结算结果。
     * @param effect 方法所需的 effect 参数。
     * @param context 本次操作所需的上下文。
     * @returns 本次处理得到的结果。
     */
    execute(effect, context) {
      const targetResults: HealthRestoreTargetResult[] = [];

      for (const targetPlayerId of getPlayerEffectTargetIds(context)) {
        const state = dependencies.getCharacterResourceState(targetPlayerId);

        if (state === null) {
          continue;
        }

        assertStateOwner(state.playerId, targetPlayerId, "character resource");
        const change = increaseCharacterResource(
          state,
          dependencies.healthResourceId,
          effect.parameters.amount,
        );

        if (change.appliedAmount === 0) {
          continue;
        }

        targetResults.push({
          targetPlayerId,
          state: change.state,
          requestedAmount: change.requestedAmount,
          restoredAmount: change.appliedAmount,
        });
      }

      if (targetResults.length === 0) {
        return {
          effectId: "health.restore",
          outcome: "skipped",
          output: null,
        };
      }

      for (const targetResult of targetResults) {
        dependencies.saveCharacterResourceState(targetResult.state);
      }

      return {
        effectId: "health.restore",
        outcome: "applied",
        output: { targets: targetResults },
      };
    },
  };
}

/**
 * 方法名：assertStateOwner
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param actualPlayerId 方法所需的 actualPlayerId 参数。
 * @param targetPlayerId 方法所需的 targetPlayerId 参数。
 * @param stateName 方法所需的 stateName 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertStateOwner(actualPlayerId: string, targetPlayerId: string, stateName: string): void {
  if (actualPlayerId !== targetPlayerId) {
    throw new Error(`${stateName} state does not belong to target player: ${targetPlayerId}`);
  }
}

/**
 * 方法名：assertNonEmptyString
 * 作用：校验输入是否满足当前模块的业务约束。
 * @param value 待处理的值。
 * @param field 方法所需的 field 参数。
 * @returns 无返回值。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
