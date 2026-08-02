import {
  applyStatusToCharacter,
  dispelCharacterStatus,
  type StatusDefinitionCatalog,
} from "../battle/status/index.ts";
import { increaseCharacterResource } from "../character/index.ts";
import type { ConsumableEffectHandler } from "./consumable-effect-handler.ts";
import { ConsumableEffectHandlerRegistry } from "./consumable-effect-handler-registry.ts";

/** 描述当前模块对外公开的业务数据契约。 */
export interface ConsumableResourceRestoreEffectOutput {
  readonly resourceId: string;
  readonly requestedAmount: number;
  readonly restoredAmount: number;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface ConsumableStatusAddEffectOutput {
  readonly statusDefinitionId: string;
  readonly statusInstanceId: string;
  readonly outcome: "applied" | "stacked" | "refreshed";
  readonly currentStacks: number;
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface ConsumableStatusRemoveEffectOutput {
  readonly statusDefinitionId: string;
  readonly statusInstanceId: string;
}

/**
 * 方法名：createResourceRestoreConsumableEffectHandler
 * 作用：创建并校验该方法所负责的业务对象。
 * @returns 本次处理得到的结果。
 */
export function createResourceRestoreConsumableEffectHandler(): ConsumableEffectHandler<
  "resource.restore",
  ConsumableResourceRestoreEffectOutput
> {
  return {
    effectId: "resource.restore",
    /**
     * 方法名：execute
     * 作用：执行该方法负责的业务规则并返回结算结果。
     * @param effect 方法所需的 effect 参数。
     * @param context 本次操作所需的上下文。
     * @returns 本次处理得到的结果。
     */
    execute(effect, context) {
      assertStateOwners(context);
      const change = increaseCharacterResource(
        context.state.resourceState,
        effect.parameters.resourceId,
        effect.parameters.amount,
      );

      if (change.appliedAmount === 0) {
        return {
          effectId: "resource.restore",
          outcome: "skipped",
          state: context.state,
          output: null,
        };
      }

      return {
        effectId: "resource.restore",
        outcome: "applied",
        state: { ...context.state, resourceState: change.state },
        output: {
          resourceId: effect.parameters.resourceId,
          requestedAmount: change.requestedAmount,
          restoredAmount: change.appliedAmount,
        },
      };
    },
  };
}

/**
 * 方法名：createStatusAddConsumableEffectHandler
 * 作用：创建并校验该方法所负责的业务对象。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function createStatusAddConsumableEffectHandler(
  definitions: StatusDefinitionCatalog,
): ConsumableEffectHandler<"status.add", ConsumableStatusAddEffectOutput> {
  return {
    effectId: "status.add",
    /**
     * 方法名：execute
     * 作用：执行该方法负责的业务规则并返回结算结果。
     * @param effect 方法所需的 effect 参数。
     * @param context 本次操作所需的上下文。
     * @returns 本次处理得到的结果。
     */
    execute(effect, context) {
      assertStateOwners(context);
      const statusInstanceId = context.createStatusInstanceId(
        context.effectIndex,
        effect.parameters.statusDefinitionId,
      );
      assertNonEmptyString(statusInstanceId, "statusInstanceId");
      const result = applyStatusToCharacter(context.state.statusState, definitions, {
        definitionId: effect.parameters.statusDefinitionId,
        newInstanceId: statusInstanceId,
        sourceId: context.itemDefinitionId,
        createdAtSequence: context.createdAtSequence,
      });

      return {
        effectId: "status.add",
        outcome: "applied",
        state: { ...context.state, statusState: result.state },
        output: {
          statusDefinitionId: result.instance.definitionId,
          statusInstanceId: result.instance.instanceId,
          outcome: result.outcome,
          currentStacks: result.instance.currentStacks,
        },
      };
    },
  };
}

/**
 * 方法名：createStatusRemoveConsumableEffectHandler
 * 作用：创建并校验该方法所负责的业务对象。
 * @param definitions 方法所需的 definitions 参数。
 * @returns 本次处理得到的结果。
 */
export function createStatusRemoveConsumableEffectHandler(
  definitions: StatusDefinitionCatalog,
): ConsumableEffectHandler<"status.remove", ConsumableStatusRemoveEffectOutput> {
  return {
    effectId: "status.remove",
    /**
     * 方法名：execute
     * 作用：执行该方法负责的业务规则并返回结算结果。
     * @param effect 方法所需的 effect 参数。
     * @param context 本次操作所需的上下文。
     * @returns 本次处理得到的结果。
     */
    execute(effect, context) {
      assertStateOwners(context);
      const instance = context.state.statusState.instances.find(
        (candidate) => candidate.definitionId === effect.parameters.statusDefinitionId,
      );

      if (instance === undefined) {
        return {
          effectId: "status.remove",
          outcome: "skipped",
          state: context.state,
          output: null,
        };
      }

      const result = dispelCharacterStatus(
        context.state.statusState,
        definitions,
        instance.instanceId,
      );

      if (result.outcome !== "dispelled") {
        return {
          effectId: "status.remove",
          outcome: "skipped",
          state: context.state,
          output: null,
        };
      }

      return {
        effectId: "status.remove",
        outcome: "applied",
        state: { ...context.state, statusState: result.state },
        output: {
          statusDefinitionId: instance.definitionId,
          statusInstanceId: instance.instanceId,
        },
      };
    },
  };
}

/**
 * 方法名：createCoreConsumableEffectHandlerRegistry
 * 作用：创建并校验该方法所负责的业务对象。
 * @param statusDefinitions 方法所需的 statusDefinitions 参数。
 * @returns 本次处理得到的结果。
 */
export function createCoreConsumableEffectHandlerRegistry(
  statusDefinitions: StatusDefinitionCatalog,
): ConsumableEffectHandlerRegistry {
  const registry = new ConsumableEffectHandlerRegistry();
  registry.register(createResourceRestoreConsumableEffectHandler());
  registry.register(createStatusAddConsumableEffectHandler(statusDefinitions));
  registry.register(createStatusRemoveConsumableEffectHandler(statusDefinitions));
  return registry;
}

/**
 * 方法名：assertStateOwners
 * 作用：校验输入是否满足当前模块的业务约束。
 * @returns 本次处理得到的结果。
 * @throws 输入或配置不满足模块约束时抛出错误。
 */
function assertStateOwners(context: {
  readonly playerId: string;
  readonly state: {
    readonly resourceState: { readonly playerId: string };
    readonly statusState: { readonly targetId: string };
  };
}): void {
  if (context.state.resourceState.playerId !== context.playerId) {
    throw new Error("Consumable resource state does not belong to the player");
  }

  if (context.state.statusState.targetId !== context.playerId) {
    throw new Error("Consumable status state does not belong to the player");
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
