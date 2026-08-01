import {
  createCharacterAttributeSnapshot,
  createEquipmentAttributeModifiers,
  createStatusAttributeModifiers,
  type AttributeModifier,
  type CharacterAttributeSnapshot,
  type CharacterState,
  type CharacterStatusState,
  type EquipmentDefinitionCatalog,
  type EquipmentLoadout,
  type StatusDefinitionCatalog,
} from "@genesis-rift/game-core";
import type { DerivedAttributeFormulaConfig, GameId, PlayerId } from "@genesis-rift/shared";

import type { Logger, LogTarget } from "../logging/index.ts";

export interface AdditionalAttributeModifierSource {
  readonly sourceName: string;
  readonly modifiers: readonly AttributeModifier[];
}

export interface CreateCharacterAttributeSnapshotRequest {
  readonly playerId: PlayerId;
  readonly playerName: string;
  readonly gameId?: GameId;
  readonly character: CharacterState;
  readonly equipmentLoadout: EquipmentLoadout;
  readonly statusState: CharacterStatusState;
  readonly additionalModifierSources?: readonly AdditionalAttributeModifierSource[];
}

export interface CharacterAttributeModifierCounts {
  readonly character: number;
  readonly equipment: number;
  readonly status: number;
  readonly additional: number;
  readonly total: number;
}

export interface CreateCharacterAttributeSnapshotResult<DerivedAttribute extends string> {
  readonly snapshot: CharacterAttributeSnapshot<DerivedAttribute>;
  readonly modifierCounts: CharacterAttributeModifierCounts;
}

export class CharacterAttributeService<DerivedAttribute extends string> {
  readonly #configs: Readonly<Record<DerivedAttribute, DerivedAttributeFormulaConfig>>;
  readonly #equipmentDefinitions: EquipmentDefinitionCatalog;
  readonly #statusDefinitions: StatusDefinitionCatalog;
  readonly #logger: Logger;

  constructor(
    configs: Readonly<Record<DerivedAttribute, DerivedAttributeFormulaConfig>>,
    equipmentDefinitions: EquipmentDefinitionCatalog,
    statusDefinitions: StatusDefinitionCatalog,
    logger: Logger,
  ) {
    this.#configs = configs;
    this.#equipmentDefinitions = equipmentDefinitions;
    this.#statusDefinitions = statusDefinitions;
    this.#logger = logger;
  }

  createSnapshot(
    request: CreateCharacterAttributeSnapshotRequest,
  ): CreateCharacterAttributeSnapshotResult<DerivedAttribute> {
    const target = this.#createTarget(request);

    try {
      this.#validateOwnership(request);
      const equipmentModifiers = createEquipmentAttributeModifiers(
        request.equipmentLoadout,
        this.#equipmentDefinitions,
      );
      const statusModifiers = createStatusAttributeModifiers(
        request.statusState.instances,
        this.#statusDefinitions,
      );
      const additionalModifiers = this.#collectAdditionalModifiers(
        request.additionalModifierSources ?? [],
      );
      const modifiers = [...equipmentModifiers, ...statusModifiers, ...additionalModifiers];
      const snapshot = createCharacterAttributeSnapshot(
        request.character,
        this.#configs,
        modifiers,
      );
      const modifierCounts = {
        character: request.character.attributeModifiers.length,
        equipment: equipmentModifiers.length,
        status: statusModifiers.length,
        additional: additionalModifiers.length,
        total: request.character.attributeModifiers.length + modifiers.length,
      };

      this.#logger.debug({
        action: "Player",
        module: "CharacterAttributeService",
        message: "Generated unified character attribute snapshot.",
        target,
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          ...modifierCounts,
          additionalSourceNames:
            request.additionalModifierSources?.map((source) => source.sourceName) ?? [],
        },
      });

      return { snapshot, modifierCounts };
    } catch (error) {
      this.#logger.error({
        action: "Player",
        module: "CharacterAttributeService",
        message: "Character attribute snapshot generation failed.",
        target,
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          errorName: error instanceof Error ? error.name : "UnknownError",
        },
      });
      throw error;
    }
  }

  #validateOwnership(request: CreateCharacterAttributeSnapshotRequest): void {
    if (request.character.playerId !== request.playerId) {
      throw new Error("Character and attribute request must belong to the same player");
    }

    if (request.equipmentLoadout.playerId !== request.playerId) {
      throw new Error("Equipment loadout and attribute request must belong to the same player");
    }

    if (request.statusState.targetId !== request.playerId) {
      throw new Error("Status state and attribute request must belong to the same player");
    }
  }

  #collectAdditionalModifiers(
    sources: readonly AdditionalAttributeModifierSource[],
  ): readonly AttributeModifier[] {
    const sourceNames = new Set<string>();
    const modifiers: AttributeModifier[] = [];

    for (const source of sources) {
      if (source.sourceName.trim().length === 0) {
        throw new TypeError("Additional attribute modifier source name must not be empty");
      }

      if (sourceNames.has(source.sourceName)) {
        throw new Error(`Duplicate additional attribute modifier source: ${source.sourceName}`);
      }

      sourceNames.add(source.sourceName);
      modifiers.push(...source.modifiers);
    }

    return modifiers;
  }

  #createTarget(request: CreateCharacterAttributeSnapshotRequest): LogTarget {
    return {
      kind: "player",
      playerId: request.playerId,
      displayName: request.playerName,
    };
  }
}
