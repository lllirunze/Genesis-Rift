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

/** 描述当前模块对外公开的业务数据契约。 */
export interface AdditionalAttributeModifierSource {
  readonly sourceName: string;
  readonly modifiers: readonly AttributeModifier[];
}

/** 描述一次业务请求所需的输入数据。 */
export interface CreateCharacterAttributeSnapshotRequest {
  readonly playerId: PlayerId;
  readonly playerName: string;
  readonly gameId?: GameId;
  readonly character: CharacterState;
  readonly equipmentLoadout: EquipmentLoadout;
  readonly statusState: CharacterStatusState;
  readonly additionalModifierSources?: readonly AdditionalAttributeModifierSource[];
}

/** 描述当前模块对外公开的业务数据契约。 */
export interface CharacterAttributeModifierCounts {
  readonly character: number;
  readonly equipment: number;
  readonly status: number;
  readonly additional: number;
  readonly total: number;
}

/** 描述业务操作完成后返回的结果。 */
export interface CreateCharacterAttributeSnapshotResult<DerivedAttribute extends string> {
  readonly snapshot: CharacterAttributeSnapshot<DerivedAttribute>;
  readonly modifierCounts: CharacterAttributeModifierCounts;
}

/** 封装该模块的状态与操作入口。 */
export class CharacterAttributeService<DerivedAttribute extends string> {
  readonly #configs: Readonly<Record<DerivedAttribute, DerivedAttributeFormulaConfig>>;
  readonly #equipmentDefinitions: EquipmentDefinitionCatalog;
  readonly #statusDefinitions: StatusDefinitionCatalog;
  readonly #logger: Logger;

  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param configs 方法所需的 configs 参数。
   * @param equipmentDefinitions 方法所需的 equipmentDefinitions 参数。
   * @param statusDefinitions 方法所需的 statusDefinitions 参数。
   * @param logger 方法所需的 logger 参数。
   * @returns 无返回值。
   */
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

  /**
   * 方法名：createSnapshot
   * 作用：创建并校验该方法所负责的业务对象。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
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
