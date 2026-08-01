import {
  advanceCharacterStatusesAtTurnEnd,
  applyStatusToCharacter,
  dispelCharacterStatus,
  removeCharacterStatusesOnDeath,
  removeCharacterStatusStacks,
  type AdvanceCharacterStatusesResult,
  type ApplyStatusToCharacterResult,
  type CharacterStatusState,
  type DispelStatusResult,
  type RemoveCharacterStatusStacksResult,
  type RemoveStatusesOnDeathResult,
  type StatusDefinitionCatalog,
} from "@genesis-rift/game-core";
import type { GameId, PlayerId } from "@genesis-rift/shared";

import type { Logger, LogTarget } from "../logging/index.ts";

export interface StatusServiceContext {
  readonly playerId: PlayerId;
  readonly playerName: string;
  readonly gameId?: GameId;
  readonly statusState: CharacterStatusState;
}

export interface ApplyStatusRequest extends StatusServiceContext {
  readonly definitionId: string;
  readonly newInstanceId: string;
  readonly sourceId: string;
  readonly createdAtSequence: number;
}

export interface RemoveStatusStacksRequest extends StatusServiceContext {
  readonly instanceId: string;
  readonly amount: number;
}

export interface DispelStatusRequest extends StatusServiceContext {
  readonly instanceId: string;
}

export class StatusService {
  readonly #definitions: StatusDefinitionCatalog;
  readonly #logger: Logger;

  constructor(definitions: StatusDefinitionCatalog, logger: Logger) {
    this.#definitions = definitions;
    this.#logger = logger;
  }

  applyStatus(request: ApplyStatusRequest): ApplyStatusToCharacterResult {
    return this.#run(request, "applyStatus", () => {
      const result = applyStatusToCharacter(request.statusState, this.#definitions, {
        definitionId: request.definitionId,
        newInstanceId: request.newInstanceId,
        sourceId: request.sourceId,
        createdAtSequence: request.createdAtSequence,
      });

      this.#logger.info({
        action: "Battle",
        module: "StatusService",
        message: this.#createApplicationMessage(result),
        target: this.#createTarget(request),
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          definitionId: request.definitionId,
          instanceId: result.instance.instanceId,
          sourceId: request.sourceId,
          outcome: result.outcome,
          previousStacks: result.previousStacks,
          currentStacks: result.instance.currentStacks,
          addedStacks: result.addedStacks,
          remainingTurns: result.instance.remainingTurns,
        },
      });

      return result;
    });
  }

  advanceStatusesAtTurnEnd(request: StatusServiceContext): AdvanceCharacterStatusesResult {
    return this.#run(request, "advanceStatusesAtTurnEnd", () => {
      const result = advanceCharacterStatusesAtTurnEnd(request.statusState, this.#definitions);

      for (const instance of result.ticked) {
        this.#logger.debug({
          action: "Battle",
          module: "StatusService",
          message: `Status ${instance.definitionId} has ${instance.remainingTurns} turns remaining.`,
          target: this.#createTarget(request),
          ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
          context: {
            definitionId: instance.definitionId,
            instanceId: instance.instanceId,
            currentStacks: instance.currentStacks,
            remainingTurns: instance.remainingTurns,
          },
        });
      }

      for (const instance of result.expired) {
        this.#logger.info({
          action: "Battle",
          module: "StatusService",
          message: `Status ${instance.definitionId} expired.`,
          target: this.#createTarget(request),
          ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
          context: {
            definitionId: instance.definitionId,
            instanceId: instance.instanceId,
            previousStacks: instance.currentStacks,
          },
        });
      }

      return result;
    });
  }

  removeStacks(request: RemoveStatusStacksRequest): RemoveCharacterStatusStacksResult {
    return this.#run(request, "removeStacks", () => {
      const result = removeCharacterStatusStacks(
        request.statusState,
        this.#definitions,
        request.instanceId,
        request.amount,
      );
      const level = result.outcome === "not_found" ? "warn" : "info";

      this.#logger[level]({
        action: "Battle",
        module: "StatusService",
        message:
          result.outcome === "not_found"
            ? `Status instance ${request.instanceId} was not found for stack removal.`
            : `Removed ${result.removedStacks} stacks from status ${request.instanceId}.`,
        target: this.#createTarget(request),
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          instanceId: request.instanceId,
          requestedStacks: request.amount,
          removedStacks: result.removedStacks,
          outcome: result.outcome,
          currentStacks: result.instance?.currentStacks ?? 0,
        },
      });

      return result;
    });
  }

  dispelStatus(request: DispelStatusRequest): DispelStatusResult {
    return this.#run(request, "dispelStatus", () => {
      const result = dispelCharacterStatus(
        request.statusState,
        this.#definitions,
        request.instanceId,
      );
      const level = result.outcome === "dispelled" ? "info" : "warn";

      this.#logger[level]({
        action: "Battle",
        module: "StatusService",
        message: this.#createDispelMessage(request.instanceId, result),
        target: this.#createTarget(request),
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          instanceId: request.instanceId,
          definitionId: result.instance?.definitionId ?? null,
          outcome: result.outcome,
        },
      });

      return result;
    });
  }

  handleDeath(request: StatusServiceContext): RemoveStatusesOnDeathResult {
    return this.#run(request, "handleDeath", () => {
      const result = removeCharacterStatusesOnDeath(request.statusState, this.#definitions);

      this.#logger.info({
        action: "Battle",
        module: "StatusService",
        message: `Removed ${result.removed.length} statuses after player death.`,
        target: this.#createTarget(request),
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          removedInstanceIds: result.removed.map((instance) => instance.instanceId),
          retainedInstanceIds: result.retained.map((instance) => instance.instanceId),
        },
      });

      return result;
    });
  }

  #run<Result>(request: StatusServiceContext, operation: string, execute: () => Result): Result {
    try {
      this.#assertRequestTarget(request);
      return execute();
    } catch (error) {
      this.#logger.error({
        action: "Battle",
        module: "StatusService",
        message: `Status operation ${operation} failed.`,
        target: this.#createTarget(request),
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          operation,
          errorName: error instanceof Error ? error.name : "UnknownError",
        },
      });
      throw error;
    }
  }

  #assertRequestTarget(request: StatusServiceContext): void {
    if (request.statusState.targetId !== request.playerId) {
      throw new Error("Status state and service request must belong to the same player");
    }
  }

  #createTarget(request: StatusServiceContext): LogTarget {
    return {
      kind: "player",
      playerId: request.playerId,
      displayName: request.playerName,
    };
  }

  #createApplicationMessage(result: ApplyStatusToCharacterResult): string {
    if (result.outcome === "applied") {
      return `Applied status ${result.instance.definitionId}.`;
    }

    if (result.outcome === "stacked") {
      return `Stacked status ${result.instance.definitionId} to ${result.instance.currentStacks}.`;
    }

    return `Refreshed status ${result.instance.definitionId}.`;
  }

  #createDispelMessage(instanceId: string, result: DispelStatusResult): string {
    if (result.outcome === "dispelled") {
      return `Dispelled status ${result.instance?.definitionId ?? instanceId}.`;
    }

    if (result.outcome === "protected") {
      return `Status ${result.instance?.definitionId ?? instanceId} could not be dispelled.`;
    }

    return `Status instance ${instanceId} was not found for dispel.`;
  }
}
