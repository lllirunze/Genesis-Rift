import type { ItemDefinitionCatalog, PlayerId, TileId } from "@genesis-rift/shared";

import {
  getEquippedEquipment,
  unequipEquipment,
  type EquipmentLoadout,
  type EquipmentSlot,
} from "../equipment/index.ts";
import {
  abandonTemporaryPickup,
  getItemDefinition,
  removeBackpackItem,
  type ItemInstance,
  type PlayerInventoryState,
} from "../inventory/index.ts";
import { pickRandomItem, type RandomStream } from "../random/index.ts";

import { createDeathRelicState, type DeathRelicState } from "./death-relic-state.ts";
import { DEATH_RELIC_LOSS_ITEM_CATEGORIES, DEATH_RELIC_LOSS_QUALITIES } from "./revival-config.ts";
import { settleDeathCoinLoss, type SettleDeathCoinLossResult } from "./settle-death-coin-loss.ts";

/** 描述死亡时可被随机选中的一个物品损失候选。 */
export interface DeathRelicLossCandidate {
  readonly item: ItemInstance;
  readonly location: "BACKPACK" | "EQUIPMENT";
  readonly equipmentSlot: EquipmentSlot | null;
}

/** 描述角色正式死亡并创建遗物包所需的完整运行时输入。 */
export interface CreateDeathRelicFromDeathInput {
  readonly deathRelicId: string;
  readonly ownerPlayerId: PlayerId;
  readonly deathTileId: TileId;
  readonly inventory: PlayerInventoryState;
  readonly equipmentLoadout: EquipmentLoadout;
  readonly itemDefinitions: ItemDefinitionCatalog;
  readonly randomStream: RandomStream;
}

/** 描述正式死亡结算后遗物、背包与装备栏的同步结果。 */
export interface CreateDeathRelicFromDeathResult {
  readonly relic: DeathRelicState;
  readonly inventory: PlayerInventoryState;
  readonly equipmentLoadout: EquipmentLoadout;
  readonly coinLoss: SettleDeathCoinLossResult;
  readonly discardedTemporaryPickup: ItemInstance | null;
  readonly lostItem: DeathRelicLossCandidate | null;
}

/**
 * 方法名：createDeathRelicFromDeath
 * 作用：按正式死亡规则清除临时拾取区、结算元宝损失、随机移除一个合格物品，并创建地图遗物包。
 * @param input 死亡角色的背包、装备栏、死亡格、静态物品定义与专属随机流。
 * @returns 同步更新后的遗物包、背包、装备栏及可用于日志和复盘的损失明细。
 * @throws 玩家归属不一致、物品定义缺失或输入状态非法时抛出错误。
 */
export function createDeathRelicFromDeath(
  input: CreateDeathRelicFromDeathInput,
): CreateDeathRelicFromDeathResult {
  assertMatchingPlayer(input);

  const temporaryPickupResult =
    input.inventory.temporaryPickup === null ? null : abandonTemporaryPickup(input.inventory);
  const inventoryWithoutTemporary = temporaryPickupResult?.inventory ?? input.inventory;
  const coinLoss = settleDeathCoinLoss(inventoryWithoutTemporary);
  const candidates = collectDeathRelicLossCandidates(
    coinLoss.inventory,
    input.equipmentLoadout,
    input.itemDefinitions,
  );
  const lostItem = candidates.length === 0 ? null : pickRandomItem(input.randomStream, candidates);
  const removal = removeLostItem(coinLoss.inventory, input.equipmentLoadout, lostItem);
  const relic = createDeathRelicState({
    deathRelicId: input.deathRelicId,
    ownerPlayerId: input.ownerPlayerId,
    tileId: input.deathTileId,
    coinQuantity: coinLoss.loss.lostCoinQuantity,
    items: lostItem === null ? [] : [lostItem.item],
  });

  return Object.freeze({
    relic,
    inventory: removal.inventory,
    equipmentLoadout: removal.equipmentLoadout,
    coinLoss,
    discardedTemporaryPickup: temporaryPickupResult?.removedPickup.item ?? null,
    lostItem,
  });
}

/**
 * 方法名：collectDeathRelicLossCandidates
 * 作用：从角色背包和已穿戴装备中收集符合死亡遗物规则的独立物品单位。
 * @param inventory 已完成临时区清除和元宝扣除的背包状态。
 * @param equipmentLoadout 当前角色已穿戴装备状态。
 * @param itemDefinitions 静态物品定义注册表。
 * @returns 可供随机流选择的损失候选列表。
 */
export function collectDeathRelicLossCandidates(
  inventory: PlayerInventoryState,
  equipmentLoadout: EquipmentLoadout,
  itemDefinitions: ItemDefinitionCatalog,
): readonly DeathRelicLossCandidate[] {
  assertMatchingInventoryAndLoadout(inventory, equipmentLoadout);
  const candidates: DeathRelicLossCandidate[] = [];

  for (const entry of inventory.backpack.entries) {
    const definition = getItemDefinition(itemDefinitions, entry.item.definitionId);

    if (isDeathRelicLossEligible(definition.category, definition.quality)) {
      candidates.push({
        item: entry.item,
        location: "BACKPACK",
        equipmentSlot: null,
      });
    }
  }

  for (const equipment of getEquippedEquipment(equipmentLoadout)) {
    const definition = getItemDefinition(itemDefinitions, equipment.definitionId);

    if (!isDeathRelicLossEligible(definition.category, definition.quality)) {
      continue;
    }

    const equipmentSlot = getEquipmentSlotByInstanceId(equipmentLoadout, equipment.instanceId);

    candidates.push({
      item: equipment,
      location: "EQUIPMENT",
      equipmentSlot,
    });
  }

  return Object.freeze(candidates);
}

/**
 * 方法名：isDeathRelicLossEligible
 * 作用：判断物品的静态类别与品质是否允许作为正式死亡时的随机损失候选。
 * @param category 物品配置中的职责类别。
 * @param quality 物品配置中的统一品质。
 * @returns 符合普通材料、消耗品或普通/优秀装备规则时返回真。
 */
function isDeathRelicLossEligible(category: string, quality: string): boolean {
  if (!DEATH_RELIC_LOSS_QUALITIES.some((candidate) => candidate === quality)) {
    return false;
  }

  return (
    DEATH_RELIC_LOSS_ITEM_CATEGORIES.some((candidate) => candidate === category) ||
    category === "equipment"
  );
}

/**
 * 方法名：removeLostItem
 * 作用：从对应的背包或装备栏移除已经被随机选中的遗物物品单位。
 * @param inventory 元宝损失结算后的背包状态。
 * @param equipmentLoadout 当前角色装备栏状态。
 * @param lostItem 当前选中的损失候选；没有候选时为 null。
 * @returns 物品移除后的背包与装备栏状态。
 */
function removeLostItem(
  inventory: PlayerInventoryState,
  equipmentLoadout: EquipmentLoadout,
  lostItem: DeathRelicLossCandidate | null,
): Pick<CreateDeathRelicFromDeathResult, "inventory" | "equipmentLoadout"> {
  if (lostItem === null) {
    return { inventory, equipmentLoadout };
  }

  if (lostItem.location === "BACKPACK") {
    return {
      inventory: {
        ...inventory,
        backpack: removeBackpackItem(inventory.backpack, lostItem.item.instanceId).backpack,
      },
      equipmentLoadout,
    };
  }

  if (lostItem.equipmentSlot === null) {
    throw new Error("Equipment death relic candidate requires an equipment slot");
  }

  return {
    inventory,
    equipmentLoadout: unequipEquipment(equipmentLoadout, lostItem.equipmentSlot).loadout,
  };
}

/** 根据装备实例标识定位其当前所在栏位。 */
function getEquipmentSlotByInstanceId(
  equipmentLoadout: EquipmentLoadout,
  instanceId: string,
): EquipmentSlot {
  for (const [slot, equipment] of Object.entries(equipmentLoadout.slots) as readonly (readonly [
    EquipmentSlot,
    ItemInstance | null,
  ])[]) {
    if (equipment?.instanceId === instanceId) {
      return slot;
    }
  }

  throw new Error(`Equipped item is missing from equipment slots: ${instanceId}`);
}

/** 校验死亡输入中的角色、背包与装备栏均属于同一玩家。 */
function assertMatchingPlayer(input: CreateDeathRelicFromDeathInput): void {
  if (input.inventory.backpack.playerId !== input.ownerPlayerId) {
    throw new Error("Death relic inventory belongs to another player");
  }

  if (input.equipmentLoadout.playerId !== input.ownerPlayerId) {
    throw new Error("Death relic equipment loadout belongs to another player");
  }
}

/** 校验背包与装备栏均属于同一玩家。 */
function assertMatchingInventoryAndLoadout(
  inventory: PlayerInventoryState,
  equipmentLoadout: EquipmentLoadout,
): void {
  if (inventory.backpack.playerId !== equipmentLoadout.playerId) {
    throw new Error("Inventory and equipment loadout must belong to the same player");
  }
}
