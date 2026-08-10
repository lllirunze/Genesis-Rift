# hand

## Responsibility

管理玩家的稀缺一次性手牌、所有玩家共用的牌库与弃牌堆，以及可扩展的手牌效果执行器。手牌不是每回合固定抽取的资源。

## Core Files

- `packages/game-core/src/systems/hand/hand-card-deck-state.ts`：共享牌库、弃牌堆和玩家手牌状态。
- `hand/acquire-hand-cards.ts`：抽取多张手牌与回收规则。
- `hand/resolve-used-hand-card.ts`：使用后的流转入口。
- `hand/effect-handlers/core-effect-handler-registry.ts`：效果处理器注册。
- `packages/game-data/src/hand-cards/hand-card-definitions.ts`：首批手牌配置。

## Core Data

每张实体手牌使用全局连续编号，名称和效果可重复。品质使用通用五级体系；类型可扩展。牌库与弃牌堆为共享状态，玩家只保存手牌 ID。

## Core Flow

特定奖励触发 → 从共享牌库获取 n 张 → 若牌库不足，先将弃牌堆洗牌放到牌库底 → 发入玩家手牌。使用 → 校验时机/目标（尚待完善）→ 效果处理器 → 弃牌或特殊去向。

## Dependencies

依赖 environment-random 洗牌；效果可依赖 combat、events、inventory-economy 和 session-runtime。

## Important Rules

- 初始每人 2 张手牌。
- 不使用“传说类型”；传说仅是品质。
- 牌库耗尽回收弃牌堆，且回收牌在牌库底部，保证原牌库尾牌先被抽到。

## Read Strategy

改牌库或抽取读 deck state 与 acquire。改一张牌读定义与其 effect handler。只有要处理响应窗口时，才扩展到 combat/turn；不要先通读所有手牌效果。
