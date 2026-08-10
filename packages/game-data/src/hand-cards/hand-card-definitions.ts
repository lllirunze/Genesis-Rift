import type { HandCardCatalog, HandCardDefinition, HandCardId } from "@genesis-rift/game-core";

/** 开局共享牌库使用的二十四张物理手牌，允许不同实体拥有相同效果。 */
export const HAND_CARD_CATALOG = Object.fromEntries(
  Array.from({ length: 24 }, (_, index) => {
    const cardId = `card_${String(index + 1).padStart(6, "0")}` as HandCardId;
    return [cardId, createStarterHandCard(cardId, index)];
  }),
) as HandCardCatalog;

/** 按固定循环创建首批治疗、移动和防御物理手牌实体。 */
function createStarterHandCard(cardId: HandCardId, index: number): HandCardDefinition {
  switch (index % 3) {
    case 0:
      return {
        cardId,
        name: "firstAid",
        description: "Restore a small amount of health to the selected player.",
        quality: "common",
        type: "survival",
        usage: {
          timing: "active",
          responseTypes: [],
          conditionIds: ["turn.isOwnerTurn"],
          targetTypes: ["player"],
        },
        effects: [{ effectId: "health.restore", parameters: { amount: 10 } }],
        destinationAfterResolution: "discard",
      };
    case 1:
      return {
        cardId,
        name: "sprint",
        description: "Increase movement for the current action.",
        quality: "common",
        type: "action",
        usage: {
          timing: "active",
          responseTypes: [],
          conditionIds: ["turn.isOwnerTurn", "player.canMove"],
          targetTypes: ["player"],
        },
        effects: [{ effectId: "movement.modify", parameters: { amount: 1 } }],
        destinationAfterResolution: "discard",
      };
    default:
      return {
        cardId,
        name: "ironWall",
        description: "Reduce incoming damage before it is resolved.",
        quality: "common",
        type: "combat",
        usage: {
          timing: "response",
          responseTypes: ["damage.beforeResolution"],
          conditionIds: ["target.isSelf"],
          targetTypes: ["player"],
        },
        effects: [{ effectId: "damage.reduce", parameters: { amount: 5 } }],
        destinationAfterResolution: "discard",
      };
  }
}
