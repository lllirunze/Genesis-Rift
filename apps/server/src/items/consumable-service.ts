import {
  createCoreConsumableEffectHandlerRegistry,
  useConsumableItem,
  type CharacterResourceState,
  type CharacterStatusState,
  type ConsumableUsageCatalog,
  type ConsumableEffectHandlerRegistry,
  type PlayerInventoryState,
  type StatusDefinitionCatalog,
  type UseConsumableItemResult,
} from "@genesis-rift/game-core";
import type { ItemDefinitionCatalog, PlayerId } from "@genesis-rift/shared";

import type { Logger, LogTarget } from "../logging/index.ts";
import type { ItemServiceContext } from "./item-service-context.ts";

/** 描述一次业务请求所需的输入数据。 */
export interface UseConsumableRequest extends ItemServiceContext {
  readonly playerId: PlayerId;
  readonly inventory: PlayerInventoryState;
  readonly resourceState: CharacterResourceState<string>;
  readonly statusState: CharacterStatusState;
  readonly itemDefinitionId: string;
  readonly createdAtSequence: number;
  readonly createStatusInstanceId: (effectIndex: number, statusDefinitionId: string) => string;
}

/** 封装该模块的状态与操作入口。 */
export class ConsumableService {
  readonly #itemDefinitions: ItemDefinitionCatalog;
  readonly #usageCatalog: ConsumableUsageCatalog;
  readonly #effectRegistry: ConsumableEffectHandlerRegistry;
  readonly #logger: Logger;

  /**
   * 方法名：constructor
   * 作用：初始化当前实例并保存其运行依赖。
   * @param itemDefinitions 方法所需的 itemDefinitions 参数。
   * @param usageCatalog 方法所需的 usageCatalog 参数。
   * @param statusDefinitions 方法所需的 statusDefinitions 参数。
   * @param logger 方法所需的 logger 参数。
   * @returns 无返回值。
   */
  constructor(
    itemDefinitions: ItemDefinitionCatalog,
    usageCatalog: ConsumableUsageCatalog,
    statusDefinitions: StatusDefinitionCatalog,
    logger: Logger,
  ) {
    this.#itemDefinitions = itemDefinitions;
    this.#usageCatalog = usageCatalog;
    this.#effectRegistry = createCoreConsumableEffectHandlerRegistry(statusDefinitions);
    this.#logger = logger;
  }

  /**
   * 方法名：useItem
   * 作用：执行该方法负责的单一业务操作。
   * @param request 方法所需的 request 参数。
   * @returns 本次处理得到的结果。
   */
  useItem(request: UseConsumableRequest): UseConsumableItemResult {
    const target = this.#createTarget(request);

    try {
      const result = useConsumableItem(
        request.inventory,
        request.resourceState,
        request.statusState,
        this.#itemDefinitions,
        this.#usageCatalog,
        this.#effectRegistry,
        {
          playerId: request.playerId,
          itemDefinitionId: request.itemDefinitionId,
          createdAtSequence: request.createdAtSequence,
          createStatusInstanceId: request.createStatusInstanceId,
        },
      );

      if (result.outcome === "used") {
        this.#logger.info({
          action: "Item",
          module: "ConsumableService",
          message: `Player used consumable item ${request.itemDefinitionId}.`,
          target,
          ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
          context: {
            itemDefinitionId: request.itemDefinitionId,
            effectOutcomes: result.effectResults.map(({ effectId, outcome }) => ({
              effectId,
              outcome,
            })),
            consumedItemInstanceIds: result.consumedItemInstanceIds,
            remainingItemQuantity: result.remainingItemQuantity,
          },
        });
      } else {
        this.#logger.debug({
          action: "Item",
          module: "ConsumableService",
          message: `Consumable item ${request.itemDefinitionId} produced no applicable effect.`,
          target,
          ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
          context: {
            itemDefinitionId: request.itemDefinitionId,
            effectOutcomes: result.effectResults.map(({ effectId, outcome }) => ({
              effectId,
              outcome,
            })),
            remainingItemQuantity: result.remainingItemQuantity,
          },
        });
      }

      return result;
    } catch (error) {
      this.#logger.warn({
        action: "Item",
        module: "ConsumableService",
        message: `Consumable item ${request.itemDefinitionId} could not be used.`,
        target,
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          itemDefinitionId: request.itemDefinitionId,
          errorName: error instanceof Error ? error.name : "UnknownError",
        },
      });
      throw error;
    }
  }

  #createTarget(request: UseConsumableRequest): LogTarget {
    return {
      kind: "player",
      playerId: request.playerId,
      displayName: request.playerName,
    };
  }
}
