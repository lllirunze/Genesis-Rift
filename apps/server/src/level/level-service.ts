import {
  applyCharacterLevelUp,
  getLevelUpEligibility,
  grantCharacterExperience,
  type CharacterState,
  type LevelUpBlockedReason,
  type LevelUpEligibility,
} from "@genesis-rift/game-core";
import type {
  GameId,
  LevelSystemConfig,
  PrimaryAttributeOffset,
  PrimaryAttributes,
} from "@genesis-rift/shared";

import type { Logger, LogTarget } from "../logging/index.ts";

export interface CharacterLevelContext {
  readonly playerName: string;
  readonly gameId?: GameId;
}

export interface GrantExperienceRequest extends CharacterLevelContext {
  readonly character: CharacterState;
  readonly amount: number;
  readonly source: string;
}

export interface GrantExperienceResult {
  readonly character: CharacterState;
  readonly eligibility: LevelUpEligibility;
  readonly becameEligible: boolean;
}

export interface AttemptLevelUpRequest extends CharacterLevelContext {
  readonly character: CharacterState;
  readonly allocation: PrimaryAttributeOffset;
}

export type AttemptLevelUpResult =
  | {
      readonly leveledUp: true;
      readonly character: CharacterState;
      readonly previousLevel: number;
      readonly currentLevel: number;
      readonly experienceSpent: number;
      readonly attributePointsAllocated: number;
    }
  | {
      readonly leveledUp: false;
      readonly character: CharacterState;
      readonly reason: LevelUpBlockedReason;
      readonly missingExperience: number;
    };

export class LevelService {
  readonly #config: LevelSystemConfig;
  readonly #logger: Logger;

  constructor(config: LevelSystemConfig, logger: Logger) {
    this.#config = config;
    this.#logger = logger;
  }

  getEligibility(character: CharacterState): LevelUpEligibility {
    return getLevelUpEligibility(character, this.#config);
  }

  grantExperience(request: GrantExperienceRequest): GrantExperienceResult {
    const target = this.#createTarget(request);
    const previousExperience = request.character.levelProgression.currentExperience;
    const previousEligibility = getLevelUpEligibility(request.character, this.#config);

    try {
      this.#assertSource(request.source);
      const character = grantCharacterExperience(request.character, request.amount);
      const eligibility = getLevelUpEligibility(character, this.#config);
      const becameEligible = !previousEligibility.canLevelUp && eligibility.canLevelUp;

      this.#logger.info({
        action: "Level",
        module: "LevelService",
        message: `Player gained ${request.amount} experience.`,
        target,
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          source: request.source,
          amount: request.amount,
          previousExperience,
          currentExperience: character.levelProgression.currentExperience,
          currentLevel: character.levelProgression.currentLevel,
        },
      });

      if (becameEligible) {
        this.#logger.info({
          action: "Level",
          module: "LevelService",
          message: `Player became eligible to reach level ${eligibility.targetLevel}.`,
          target,
          ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
          context: {
            targetLevel: eligibility.targetLevel,
            experienceRequired: eligibility.experienceRequired,
            freePrimaryAttributePoints: eligibility.freePrimaryAttributePoints,
          },
        });
      }

      return { character, eligibility, becameEligible };
    } catch (error) {
      this.#logFailure(request, target, "Experience grant failed.", error, {
        amount: request.amount,
        source: request.source,
        previousExperience,
      });
      throw error;
    }
  }

  attemptLevelUp(request: AttemptLevelUpRequest): AttemptLevelUpResult {
    const target = this.#createTarget(request);
    const eligibility = getLevelUpEligibility(request.character, this.#config);

    if (!eligibility.canLevelUp) {
      this.#logger.warn({
        action: "Level",
        module: "LevelService",
        message: `Player could not level up because of ${eligibility.reason}.`,
        target,
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          reason: eligibility.reason,
          currentLevel: request.character.levelProgression.currentLevel,
          currentExperience: request.character.levelProgression.currentExperience,
          targetLevel: eligibility.targetLevel,
          experienceRequired: eligibility.experienceRequired,
          missingExperience: eligibility.missingExperience,
        },
      });

      return {
        leveledUp: false,
        character: request.character,
        reason: eligibility.reason,
        missingExperience: eligibility.missingExperience,
      };
    }

    const previousAttributes = request.character.currentPrimaryAttributes;
    const previousLevel = request.character.levelProgression.currentLevel;

    try {
      const character = applyCharacterLevelUp(request.character, this.#config, request.allocation);

      this.#logger.info({
        action: "Level",
        module: "LevelService",
        message: `Player reached level ${character.levelProgression.currentLevel}.`,
        target,
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          previousLevel,
          currentLevel: character.levelProgression.currentLevel,
          experienceSpent: eligibility.experienceRequired,
          remainingExperience: character.levelProgression.currentExperience,
          freePrimaryAttributePoints: eligibility.freePrimaryAttributePoints,
        },
      });
      this.#logAttributeAllocation(
        request,
        target,
        previousAttributes,
        character.currentPrimaryAttributes,
        eligibility.freePrimaryAttributePoints,
      );

      return {
        leveledUp: true,
        character,
        previousLevel,
        currentLevel: character.levelProgression.currentLevel,
        experienceSpent: eligibility.experienceRequired,
        attributePointsAllocated: eligibility.freePrimaryAttributePoints,
      };
    } catch (error) {
      this.#logFailure(request, target, "Character level up failed.", error, {
        currentLevel: previousLevel,
        currentExperience: request.character.levelProgression.currentExperience,
        allocation: request.allocation,
      });
      throw error;
    }
  }

  #logAttributeAllocation(
    request: AttemptLevelUpRequest,
    target: LogTarget,
    previousAttributes: PrimaryAttributes,
    currentAttributes: PrimaryAttributes,
    points: number,
  ): void {
    const pointLabel = points === 1 ? "point" : "points";
    this.#logger.info({
      action: "Level",
      module: "LevelService",
      message: `Player allocated ${points} primary attribute ${pointLabel}.`,
      target,
      ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
      context: {
        allocation: request.allocation,
        previousAttributes,
        currentAttributes,
      },
    });
  }

  #logFailure(
    request: CharacterLevelContext,
    target: LogTarget,
    message: string,
    error: unknown,
    context: Readonly<Record<string, unknown>>,
  ): void {
    this.#logger.error({
      action: "Level",
      module: "LevelService",
      message,
      target,
      ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
      context: {
        ...context,
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
    });
  }

  #createTarget(
    request: CharacterLevelContext & { readonly character: CharacterState },
  ): LogTarget {
    return {
      kind: "player",
      playerId: request.character.playerId,
      displayName: request.playerName,
    };
  }

  #assertSource(source: string): void {
    if (source.trim().length === 0) {
      throw new TypeError("Experience source cannot be empty.");
    }
  }
}
