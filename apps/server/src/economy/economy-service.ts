import {
  canAffordCoin,
  getCoinBalance,
  purchaseItemWithCoin,
  receiveCoin,
  spendCoin,
  type CoinPaymentRecord,
  type PlayerInventoryState,
  type PurchaseItemWithCoinResult,
  type UnresolvedReceivedItem,
} from "@genesis-rift/game-core";
import type { GameId, ItemDefinitionCatalog } from "@genesis-rift/shared";

import type { Logger, LogTarget } from "../logging/index.ts";

export interface EconomyPlayerContext {
  readonly playerName: string;
  readonly gameId?: GameId;
}

interface EconomyInventoryRequest extends EconomyPlayerContext {
  readonly inventory: PlayerInventoryState;
}

export interface ReceiveCoinRequest extends EconomyInventoryRequest {
  readonly quantity: number;
  readonly sourceId: string;
  readonly newItemInstanceIds: readonly string[];
  readonly allowTemporaryStorage?: boolean;
}

export interface ReceiveCoinServiceResult {
  readonly inventory: PlayerInventoryState;
  readonly previousBalance: number;
  readonly currentBalance: number;
  readonly backpackQuantityAdded: number;
  readonly temporaryQuantityAdded: number;
  readonly unresolvedItems: readonly UnresolvedReceivedItem[];
}

export interface PayCoinRequest extends EconomyInventoryRequest {
  readonly coinQuantity: number;
  readonly reasonId: string;
}

export interface PurchaseItemRequest extends EconomyInventoryRequest {
  readonly transactionId: string;
  readonly itemDefinitionId: string;
  readonly itemQuantity: number;
  readonly totalCoinPrice: number;
  readonly newItemInstanceIds: readonly string[];
  readonly stackCompatibilityKey?: string;
}

export type PayCoinResult =
  | {
      readonly paid: true;
      readonly inventory: PlayerInventoryState;
      readonly previousBalance: number;
      readonly currentBalance: number;
      readonly payment: CoinPaymentRecord;
    }
  | {
      readonly paid: false;
      readonly inventory: PlayerInventoryState;
      readonly reason: "insufficient-coin";
      readonly requiredCoinQuantity: number;
      readonly currentBalance: number;
      readonly missingCoinQuantity: number;
    };

export class EconomyService {
  readonly #definitions: ItemDefinitionCatalog;
  readonly #logger: Logger;

  constructor(definitions: ItemDefinitionCatalog, logger: Logger) {
    this.#definitions = definitions;
    this.#logger = logger;
  }

  getBalance(inventory: PlayerInventoryState): number {
    return getCoinBalance(inventory);
  }

  canAfford(inventory: PlayerInventoryState, coinQuantity: number): boolean {
    return canAffordCoin(inventory, coinQuantity);
  }

  receiveCoins(request: ReceiveCoinRequest): ReceiveCoinServiceResult {
    const target = this.#createTarget(request);
    const previousBalance = getCoinBalance(request.inventory);

    try {
      const result = receiveCoin(
        request.inventory,
        {
          quantity: request.quantity,
          sourceId: request.sourceId,
          newItemInstanceIds: request.newItemInstanceIds,
          ...(request.allowTemporaryStorage === undefined
            ? {}
            : { allowTemporaryStorage: request.allowTemporaryStorage }),
        },
        this.#definitions,
      );
      const currentBalance = getCoinBalance(result.inventory);
      const unresolvedQuantity = result.unresolvedItems.reduce(
        (total, unresolved) => total + unresolved.item.quantity,
        0,
      );

      this.#logger.info({
        action: "Item",
        module: "EconomyService",
        message: `Player added ${result.backpackQuantityAdded} Coin to the backpack.`,
        target,
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          sourceId: request.sourceId,
          requestedQuantity: request.quantity,
          backpackQuantityAdded: result.backpackQuantityAdded,
          temporaryQuantityAdded: result.temporaryQuantityAdded,
          unresolvedQuantity,
          previousBalance,
          currentBalance,
        },
      });

      if (result.temporaryQuantityAdded > 0) {
        this.#logger.info({
          action: "Item",
          module: "EconomyService",
          message: `Player stored ${result.temporaryQuantityAdded} Coin in temporary pickup.`,
          target,
          ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
          context: {
            sourceId: request.sourceId,
            temporaryQuantityAdded: result.temporaryQuantityAdded,
          },
        });
      }

      if (unresolvedQuantity > 0) {
        this.#logger.warn({
          action: "Item",
          module: "EconomyService",
          message: `${unresolvedQuantity} Coin could not be stored.`,
          target,
          ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
          context: {
            sourceId: request.sourceId,
            unresolvedQuantity,
            unresolvedItemInstanceIds: result.unresolvedItems.map(
              (unresolved) => unresolved.item.instanceId,
            ),
          },
        });
      }

      return {
        inventory: result.inventory,
        previousBalance,
        currentBalance,
        backpackQuantityAdded: result.backpackQuantityAdded,
        temporaryQuantityAdded: result.temporaryQuantityAdded,
        unresolvedItems: result.unresolvedItems,
      };
    } catch (error) {
      this.#logError("Item", request, target, "Coin receipt failed.", error, {
        quantity: request.quantity,
        sourceId: request.sourceId,
        previousBalance,
      });
      throw error;
    }
  }

  payCoins(request: PayCoinRequest): PayCoinResult {
    const target = this.#createTarget(request);

    try {
      this.#assertReasonId(request.reasonId);
      const previousBalance = getCoinBalance(request.inventory);

      if (!canAffordCoin(request.inventory, request.coinQuantity)) {
        const missingCoinQuantity = request.coinQuantity - previousBalance;
        this.#logger.warn({
          action: "Shop",
          module: "EconomyService",
          message: "Coin payment failed because the balance was insufficient.",
          target,
          ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
          context: {
            reasonId: request.reasonId,
            requiredCoinQuantity: request.coinQuantity,
            currentBalance: previousBalance,
            missingCoinQuantity,
          },
        });

        return {
          paid: false,
          inventory: request.inventory,
          reason: "insufficient-coin",
          requiredCoinQuantity: request.coinQuantity,
          currentBalance: previousBalance,
          missingCoinQuantity,
        };
      }

      const result = spendCoin(request.inventory, {
        coinQuantity: request.coinQuantity,
        reasonId: request.reasonId,
      });
      this.#logger.info({
        action: "Shop",
        module: "EconomyService",
        message: `Player paid ${request.coinQuantity} Coin.`,
        target,
        ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
        context: {
          reasonId: request.reasonId,
          coinQuantity: request.coinQuantity,
          previousBalance,
          currentBalance: result.remainingBalance,
          consumedItemInstanceIds: result.payment.consumedItemInstanceIds,
        },
      });

      return {
        paid: true,
        inventory: result.inventory,
        previousBalance,
        currentBalance: result.remainingBalance,
        payment: result.payment,
      };
    } catch (error) {
      this.#logError("Shop", request, target, "Coin payment failed.", error, {
        coinQuantity: request.coinQuantity,
        reasonId: request.reasonId,
      });
      throw error;
    }
  }

  purchaseItem(request: PurchaseItemRequest): PurchaseItemWithCoinResult {
    const target = this.#createTarget(request);

    try {
      const result = purchaseItemWithCoin(
        request.inventory,
        {
          transactionId: request.transactionId,
          itemDefinitionId: request.itemDefinitionId,
          itemQuantity: request.itemQuantity,
          totalCoinPrice: request.totalCoinPrice,
          newItemInstanceIds: request.newItemInstanceIds,
          ...(request.stackCompatibilityKey === undefined
            ? {}
            : { stackCompatibilityKey: request.stackCompatibilityKey }),
        },
        this.#definitions,
      );

      if (result.purchased) {
        this.#logger.info({
          action: "Shop",
          module: "EconomyService",
          message: `Player purchased ${result.purchasedQuantity} units of item ${result.itemDefinitionId}.`,
          target,
          ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
          context: {
            transactionId: result.transactionId,
            itemDefinitionId: result.itemDefinitionId,
            purchasedQuantity: result.purchasedQuantity,
            totalCoinPrice: result.totalCoinPrice,
            previousCoinBalance: result.previousCoinBalance,
            currentCoinBalance: result.currentCoinBalance,
            consumedCoinInstanceIds: result.payment.consumedItemInstanceIds,
            receivedItemInstanceIds: result.receivedItemInstanceIds,
          },
        });
      } else {
        this.#logger.warn({
          action: "Shop",
          module: "EconomyService",
          message:
            result.reason === "insufficient-coin"
              ? "Item purchase failed because the Coin balance was insufficient."
              : "Item purchase failed because the backpack had insufficient continuous space.",
          target,
          ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
          context: {
            transactionId: result.transactionId,
            itemDefinitionId: result.itemDefinitionId,
            requestedQuantity: result.requestedQuantity,
            totalCoinPrice: result.totalCoinPrice,
            previousCoinBalance: result.previousCoinBalance,
            reason: result.reason,
            ...(result.reason === "insufficient-coin"
              ? { missingCoinQuantity: result.missingCoinQuantity }
              : { unstoredItemQuantity: result.unstoredItemQuantity }),
          },
        });
      }

      return result;
    } catch (error) {
      this.#logError("Shop", request, target, "Item purchase failed.", error, {
        transactionId: request.transactionId,
        itemDefinitionId: request.itemDefinitionId,
        itemQuantity: request.itemQuantity,
        totalCoinPrice: request.totalCoinPrice,
      });
      throw error;
    }
  }

  #logError(
    action: "Item" | "Shop",
    request: EconomyPlayerContext,
    target: LogTarget,
    message: string,
    error: unknown,
    context: Readonly<Record<string, unknown>>,
  ): void {
    this.#logger.error({
      action,
      module: "EconomyService",
      message,
      target,
      ...(request.gameId === undefined ? {} : { gameId: request.gameId }),
      context: {
        ...context,
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
    });
  }

  #createTarget(request: EconomyInventoryRequest): LogTarget {
    return {
      kind: "player",
      playerId: request.inventory.backpack.playerId,
      displayName: request.playerName,
    };
  }

  #assertReasonId(reasonId: string): void {
    if (reasonId.trim().length === 0) {
      throw new TypeError("Coin payment reasonId cannot be empty.");
    }
  }
}
