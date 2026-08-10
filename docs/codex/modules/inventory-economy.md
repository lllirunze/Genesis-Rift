# inventory-economy

## Responsibility

处理二维背包、物品实例、临时拾取区、装备栏、元宝支付、玩家交易、商店、图纸制造和 NPC 服务。

## Core Files

- `packages/game-core/src/systems/inventory/player-inventory-state.ts`：背包与临时拾取区状态。
- `systems/inventory/receive-item.ts`：物品进入背包/临时区的统一入口。
- `systems/equipment/equipment-inventory-interaction.ts`：背包与装备栏穿卸规则。
- `systems/economy/purchase-item-with-coin.ts`、`settle-player-trade.ts`：原子购买与交易。
- `systems/crafting/craft-item.ts`：图纸、材料、元宝与制造条件。
- `apps/server/src/items/inventory-service.ts`：服务端物品编排。

## Core Data

`PlayerInventoryState` 含固定 8×10 网格、等级可用范围、物品条目和单格临时拾取区。`ItemInstance` 是运行时实例；`ItemDefinition` 和 `EquipmentDefinition` 是静态定义。元宝定义为普通的可堆叠物品，数量即支付单位。

## Core Flow

获得/购买/制造 → 优先叠加 → 检查合法连续空间 → 放入背包或临时拾取区 → 不可变状态更新。装备穿卸同样先校验背包空间；交易和购买必须保证扣款与物品变化原子成功或失败。

## Dependencies

character-growth 提供消耗品资源效果与装备属性修饰；game-data 提供定义；session-runtime 负责权威命令与私有快照；revival-contract 处理死亡遗物。

## Important Rules

- 物品不可旋转，均为矩形占格。
- 一级 4×6、二级 6×6、三级 6×8，只解锁固定 8×10 网格左上区域。
- 临时区只能接收新获得且无法放入背包的一个物品，3 个本人回合后消失，背包物品不可移入。
- 他人只见占格遮罩，装备栏公开；背包内容默认私有。

## Read Strategy

背包布局只读 inventory 状态和目标操作。穿卸读 equipment interaction。支付/商店读 economy 与 NPC。制造读 crafting；除非新增命令或快照，否则无需读 `game-session.ts`。
