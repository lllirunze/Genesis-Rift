# game-data

## Responsibility

集中维护静态游戏资源与数值，不保存玩家运行时状态。服务端启动时统一校验，以提前阻止无效配置进入对局。

## Core Files

- `packages/game-data/src/index.ts`：公共配置出口。
- `validation/validate-game-data.ts`：启动时统一校验入口。
- `attributes/derived-attribute-configs.ts`：派生属性公式参数。
- `items/item-definitions.ts`、`equipment/equipment-definitions.ts`：物品与装备目录。
- `maps/map-content-definitions.ts`：地图内容目录。
- `events/event-definitions.ts`、`quests/quest-definitions.ts`、`missions/mission-definitions.ts`：目标与事件资源。

## Core Data

配置使用稳定资源 ID 和独立业务字段。配置内容包括身份、种族、资源、等级、状态、技能、天气、手牌、图纸、NPC、商店、契约等。

## Core Flow

core 定义约束 → game-data 配置实现 → `validateGameData()` 校验 → 初始会话与规则服务读取。

## Dependencies

依赖 shared 类型和部分 game-core 定义/校验。被所有使用固定资源的模块读取。

## Important Rules

- 固定数值不得写死在业务服务中。
- 新资源要有对应测试，并被统一验证器覆盖。
- 配置不是 UI 本地数据；前端展示仍受服务端权限限制。

## Read Strategy

调整数值只读对应配置和其验证。新增资源先读 core 的定义类型，再读同领域配置文件与验证器；只有影响初始化时才读 session 工厂。
