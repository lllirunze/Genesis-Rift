# events

## Responsibility

管理事件定义、分类事件池、条件筛选、权重抽取、揭露方式、选项、效果和持续事件。它提供随机世界反馈，不替代 Quest 或 Mission。

## Core Files

- `packages/game-core/src/systems/event/event-definition.ts`：事件静态结构。
- `event/settle-event-flow.ts`：触发、揭露、选项和结算协调。
- `event/collect-event-pool-candidates.ts`：条件、冷却、唯一性和候选筛选。
- `event/event-gameplay-effect-adapter.ts`：资源、物品、状态、移动、天气等效果适配。
- `event/activate-event-duration.ts`：持续事件状态。
- `packages/game-data/src/events/event-definitions.ts`、`event-pool-definitions.ts`：配置。

## Core Data

事件具备类别、品质、条件、揭露模式、选项、基础效果和可选持续时间。强制揭露事件自动结算；可选择揭露事件放弃后不公开内容、不发生效果。

## Core Flow

触发来源 → 确定事件池 → 筛选候选 → 随机权重抽取 → 强制/选择揭露 → 选项 → 效果适配 → 激活持续状态或结束。

## Dependencies

依赖 environment-random；可修改 map-world、character-growth、inventory-economy，或推进 quests-missions；由 session-runtime 在首次探索时接入，并通过私有事件命令完成揭露与选项结算。

## Important Rules

- 已发生事实使用强制揭露；主动探索未知可使用可选择揭露。
- 放弃选择揭露时，事件内容与结果都不得泄露。
- 新事件优先通过配置和基础效果组合实现，避免单独业务分支。
- `item.obtainFromPool` 使用独立事件随机流并通过统一背包接收流程发放；`battle.start` 在服务端创建敌对遭遇实例，后续攻击与 AI 必须基于该实例继续处理。

## Read Strategy

改事件内容先读 definition/pool/data。改会话中的揭露或选项命令先读 `game-session.ts`、`game-command-service.ts` 和 shared 协议；改一种效果只读 adapter 的对应分支和被调用模块；不默认加载全部事件配置。
