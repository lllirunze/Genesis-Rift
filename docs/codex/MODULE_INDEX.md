# 模块导航索引

仅按任务读取一个或少数模块说明；不要顺序通读。

## web-client

Purpose: 浏览器连接、房间界面与权威快照展示。
Paths: `apps/web/src/{app,features,lib,state}`。
Key Files: `app/app.tsx`, `features/room/lan-room-client.ts`, `features/room/use-lan-room-lobby.ts`, `state/connection-store.ts`。
Dependencies: shared-contracts, lan-server。
Read When: 修改页面、Socket 客户端、前端状态或展示权限。
Related Modules: session-runtime。

## lan-server

Purpose: 单房间局域网 HTTP/Socket.IO、身份绑定、白名单与事件传输。
Paths: `apps/server/src/{server,transport,rooms,sessions,security}`。
Key Files: `server/create-lan-server.ts`, `transport/bind-game-socket-events.ts`, `transport/bind-room-socket-events.ts`, `rooms/room-manager.ts`, `sessions/socket-session-manager.ts`。
Dependencies: session-runtime, shared-contracts, observability。
Read When: 修改联机、房间、断线、权限、协议绑定或 IP 限制。
Related Modules: web-client。

## session-runtime

Purpose: 创建并权威编排单局游戏、命令、回合和查看者快照。
Paths: `apps/server/src/game`, `packages/game-core/src/core/game`。
Key Files: `game-session.ts`, `game-command-service.ts`, `default-initial-game-session-factory.ts`, `start-game-service.ts`, `game-session-state.ts`。
Dependencies: 所有规则模块、shared-contracts、game-data。
Read When: 新增命令、会话级状态、初始化、回合结算或私有/公开投影。
Related Modules: lan-server, character-growth, map-world, combat, inventory-economy。

## shared-contracts

Purpose: 跨包类型、稳定资源 ID、通用配置与 LAN 协议。
Paths: `packages/shared/src/{protocol,types,config,validation}`。
Key Files: `protocol/lan-events.ts`, `types/ids.ts`, `types/attributes.ts`, `config/quality-config.ts`, `config/resource-id-config.ts`。
Dependencies: 无。
Read When: 修改跨端字段、资源 ID、品质、属性或命令契约。
Related Modules: web-client, lan-server, game-data。

## game-data

Purpose: 静态资源定义、数值配置与启动校验。
Paths: `packages/game-data/src`。
Key Files: `index.ts`, `validation/validate-game-data.ts`, `attributes/derived-attribute-configs.ts`, `maps/map-content-definitions.ts`, `items/item-definitions.ts`。
Dependencies: shared-contracts, 对应 game-core 定义。
Read When: 新增或调整身份、种族、物品、地图、事件、技能等固定内容。
Related Modules: 对应规则模块。

## character-growth

Purpose: 角色基础/派生属性、资源、等级与属性修饰聚合。
Paths: `packages/game-core/src/systems/{character,attribute,level}`, `apps/server/src/{attributes,level,status}`。
Key Files: `character-state.ts`, `character-attribute-snapshot.ts`, `level-up.ts`, `character-attribute-service.ts`, `level-service.ts`。
Dependencies: game-data, inventory-economy, combat。
Read When: 修改属性公式、升级、资源上限、状态或装备数值影响。
Related Modules: combat, inventory-economy。

## map-world

Purpose: 平顶六边形地图、坐标、地形、探索、视野、移动与特殊位移。
Paths: `packages/game-core/src/systems/map`, `packages/game-data/src/maps`。
Key Files: `map/model/hex-map.ts`, `map/geometry/cube-coordinate.ts`, `map/movement/settle-normal-movement.ts`, `map/vision/calculate-current-vision.ts`, `map/connection/settle-special-connection.ts`, `maps/map-content-definitions.ts`。
Dependencies: environment-random, session-runtime。
Read When: 修改地块、坐标、通行、移动成本、探索、视野、出生点或传送。
Related Modules: events, revival-contract, combat。

## inventory-economy

Purpose: 二维背包、物品、装备栏、元宝、交易、商店、图纸制造与 NPC 交互。
Paths: `packages/game-core/src/systems/{inventory,equipment,economy,crafting,npc}`, `apps/server/src/{items,economy}`。
Key Files: `inventory/player-inventory-state.ts`, `inventory/receive-item.ts`, `equipment/equipment-inventory-interaction.ts`, `economy/purchase-item-with-coin.ts`, `crafting/craft-item.ts`, `items/inventory-service.ts`。
Dependencies: character-growth, game-data, session-runtime。
Read When: 修改背包、物品、装备穿卸、元宝支付、交易、商店或制造。
Related Modules: revival-contract, quests-missions。

## combat

Purpose: 攻击资格、伤害、闪避、暴击、护盾、击倒、状态与技能结算。
Paths: `packages/game-core/src/systems/{battle,skill}`, `apps/server/src/status`。
Key Files: `battle/attack/resolve-attack.ts`, `battle/damage/calculate-damage.ts`, `battle/status/character-status-state.ts`, `battle/settlement/battle-settlement.ts`, `skill/use-active-skill.ts`。
Dependencies: character-growth, inventory-economy, environment-random, session-runtime。
Read When: 修改攻击、伤害、Buff/Debuff、技能、生存或战斗奖励。
Related Modules: hand, revival-contract。

## hand

Purpose: 共享牌库、弃牌堆、玩家手牌、抽取和效果执行框架。
Paths: `packages/game-core/src/systems/hand`, `packages/game-data/src/hand-cards`。
Key Files: `hand-card-deck-state.ts`, `acquire-hand-cards.ts`, `resolve-used-hand-card.ts`, `effect-handlers/core-effect-handler-registry.ts`, `hand-card-definitions.ts`。
Dependencies: environment-random, combat, events, session-runtime。
Read When: 修改手牌定义、牌库洗牌、抽牌、弃牌、目标或效果。
Related Modules: shared-contracts, game-data。

## events

Purpose: 分类事件池、触发条件、揭露模式、选项、效果与持续事件。
Paths: `packages/game-core/src/systems/event`, `packages/game-data/src/events`。
Key Files: `event-definition.ts`, `settle-event-flow.ts`, `collect-event-pool-candidates.ts`, `event-gameplay-effect-adapter.ts`, `event-definitions.ts`。
Dependencies: environment-random, map-world, character-growth, inventory-economy, quests-missions。
Read When: 修改事件抽取、强制/可选揭露、事件选项、效果或持续时间。
Related Modules: hand, session-runtime。

## quests-missions

Purpose: 支线任务、隐藏使命、进度、奖励、重塑与胜利判断。
Paths: `packages/game-core/src/systems/{quest,mission}`, `packages/game-data/src/{quests,missions}`。
Key Files: `quest-runtime-state.ts`, `quest-progress-adapter.ts`, `quest-reward-dispatch.ts`, `generate-mission-set.ts`, `reforge-mission.ts`。
Dependencies: inventory-economy, events, character-growth, session-runtime。
Read When: 修改任务领取/放弃/奖励，或使命生成、进度、替换、获胜。
Related Modules: game-data。

## environment-random

Purpose: 主种子与独立随机流、骰子、昼夜、天气牌库、环境回合结算。
Paths: `packages/game-core/src/systems/{random,environment}`, `apps/server/src/random`, `packages/game-data/src/weather`。
Key Files: `random/core/random-manager.ts`, `random/service/dice.ts`, `environment/settle-environment-round.ts`, `weather/weather-deck.ts`, `weather/weather-config.ts`。
Dependencies: shared-contracts, game-data, session-runtime。
Read When: 修改随机、D6/D20、天气、昼夜、灾害、环境对移动或视野的影响。
Related Modules: map-world, events, combat, hand。

## revival-contract

Purpose: 击倒后的死亡、灵魂轮回、中途加入、死亡遗物与神鬼契约。
Paths: `packages/game-core/src/systems/{revival,contract}`, `packages/game-data/src/contracts`。
Key Files: `revival/soul-state.ts`, `revival/reincarnation-roll.ts`, `revival/complete-reincarnation.ts`, `revival/death-relic-runtime-state.ts`, `contract-runtime-state.ts`。
Dependencies: combat, map-world, inventory-economy, environment-random, session-runtime。
Read When: 修改死亡代价、遗物包、复活、中途加入、保护或契约。
Related Modules: lan-server。

## observability

Purpose: 统一结构化日志、格式化、异步文件写入与轮转。
Paths: `apps/server/src/logging`。
Key Files: `logger.ts`, `log-record.ts`, `log-formatter.ts`, `file-log-writer.ts`, `log-config.ts`。
Dependencies: 无业务规则依赖。
Read When: 修改日志格式、存储、轮转、记录级别或服务端日志接入。
Related Modules: lan-server, session-runtime。
