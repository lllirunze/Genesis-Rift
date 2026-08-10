# character-growth

## Responsibility

管理角色创建后的基础属性、派生属性、资源、等级经验和统一属性修饰。该模块提供数值结果，不决定具体战斗或物品流程。

## Core Files

- `packages/game-core/src/systems/character/character-state.ts`：角色核心运行时状态。
- `systems/attribute/character-attribute-snapshot.ts`：统一属性快照生成。
- `systems/attribute/aggregate-attribute-modifiers.ts`：聚合动态修饰。
- `systems/level/level-up.ts`：升级资格、经验消耗与永久属性成长。
- `apps/server/src/attributes/character-attribute-service.ts`：装备、状态与额外修饰的服务端装配。
- `apps/server/src/level/level-service.ts`：服务端等级编排与日志。

## Core Data

`CharacterState` 包含身份、种族、五维基础属性、修饰器与等级状态。`CharacterAttributeSnapshot` 输出当前/有效基础属性和最终派生属性。资源状态独立保存 current/minimum/maximum。

## Core Flow

角色基础属性 + 自身修饰 + 装备修饰 + 状态修饰 → 属性快照 → 同步资源上限或供战斗/移动读取。

## Dependencies

读取 game-data 属性、资源和等级配置；装备与状态提供修饰器；combat、map-world 读取最终结果。

## Important Rules

- 基础属性不直接参与玩法，玩法应读取派生属性。
- 永久成长改角色基础属性；临时影响通过修饰器。
- 最终数值遵循统一配置和整数取整，不为单个属性在业务层另写公式。

## Read Strategy

改公式先读属性快照、配置与公式测试。改升级再读 level 文件。涉及装备/状态只读其“生成修饰器”的文件，不要先进入完整战斗实现。
