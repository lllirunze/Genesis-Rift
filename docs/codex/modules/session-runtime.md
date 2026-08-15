# session-runtime

## Responsibility

服务端的单局权威编排模块。它创建完整会话、维护回合与连接状态，将客户端命令映射到纯规则，并生成公开或按查看者裁剪的快照。

## Core Files

- `apps/server/src/game/game-session.ts`：`ServerGameSession`，权威状态变更与公开/私有快照投影中心。
- `game-command-service.ts`：客户端命令到会话操作的统一分派。
- `default-initial-game-session-factory.ts`：用静态配置创建开局玩家、地图、牌堆和随机状态。
- `default-map-configuration.ts`：按固定坐标生成默认地图的地形、高度、区域与地点设施，不消耗随机流。
- `start-game-service.ts`：从大厅启动唯一会话。
- `game-session-manager.ts`：保存唯一活动会话。
- `packages/game-core/src/core/game/game-session-state.ts`：完整会话、玩家、世界状态与不可变替换接口。

## Core Data

`GameSessionState` 聚合玩家 `character/resources/statuses/inventory/equipment/hand/map/battle/revival` 与世界 `map/handCardDeck/environment/eventRuntime/random`。`GameSessionValidationContext` 集合所有必要静态定义。

## Core Flow

房间开始 → 初始工厂 → `GameSessionState` 校验 → `ServerGameSession`。命令 → `GameCommandService` → 会话方法 → game-core 规则 → 不可变替换/版本递增 → 快照与事件。

## Dependencies

读取对应 game-core 系统和 game-data 配置；由 `lan-server` 调用；向 `observability` 写服务端业务日志。

## Important Rules

- 完整状态只可在服务端读取。
- 公开 `players` 与本人 `viewer` 数据必须分离；背包、手牌、角色数值和已探索地图都不得广播。
- 所有状态替换都必须经过验证上下文。
- 事件内容仅通过触发者的 `viewer.activeEvent` 下发；其他玩家和公开快照不能获知未揭露事件。

## Read Strategy

新增会话命令先读 `game-command-service.ts`、目标 `ServerGameSession` 方法和 shared 请求类型；再读对应纯规则。只改快照时读 `game-session.ts` 与 `lan-events.ts`，无需读取其他规则目录。
