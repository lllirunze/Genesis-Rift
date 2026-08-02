import {
  applyStatusToCharacter,
  dispelCharacterStatus,
  type StatusDefinitionCatalog,
} from "../battle/status/index.ts";
import { increaseCharacterResource } from "../character/index.ts";
import type { ConsumableEffectHandler } from "./consumable-effect-handler.ts";
import { ConsumableEffectHandlerRegistry } from "./consumable-effect-handler-registry.ts";

export interface ConsumableResourceRestoreEffectOutput {
  readonly resourceId: string;
  readonly requestedAmount: number;
  readonly restoredAmount: number;
}

export interface ConsumableStatusAddEffectOutput {
  readonly statusDefinitionId: string;
  readonly statusInstanceId: string;
  readonly outcome: "applied" | "stacked" | "refreshed";
  readonly currentStacks: number;
}

export interface ConsumableStatusRemoveEffectOutput {
  readonly statusDefinitionId: string;
  readonly statusInstanceId: string;
}

export function createResourceRestoreConsumableEffectHandler(): ConsumableEffectHandler<
  "resource.restore",
  ConsumableResourceRestoreEffectOutput
> {
  return {
    effectId: "resource.restore",
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

export function createStatusAddConsumableEffectHandler(
  definitions: StatusDefinitionCatalog,
): ConsumableEffectHandler<"status.add", ConsumableStatusAddEffectOutput> {
  return {
    effectId: "status.add",
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

export function createStatusRemoveConsumableEffectHandler(
  definitions: StatusDefinitionCatalog,
): ConsumableEffectHandler<"status.remove", ConsumableStatusRemoveEffectOutput> {
  return {
    effectId: "status.remove",
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

export function createCoreConsumableEffectHandlerRegistry(
  statusDefinitions: StatusDefinitionCatalog,
): ConsumableEffectHandlerRegistry {
  const registry = new ConsumableEffectHandlerRegistry();
  registry.register(createResourceRestoreConsumableEffectHandler());
  registry.register(createStatusAddConsumableEffectHandler(statusDefinitions));
  registry.register(createStatusRemoveConsumableEffectHandler(statusDefinitions));
  return registry;
}

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

function assertNonEmptyString(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must not be empty`);
  }
}
