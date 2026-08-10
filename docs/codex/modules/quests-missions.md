# quests-missions

## Responsibility

管理游戏过程中的 Quest（任务/委托）和决定胜负的 Mission（使命）。两者名称相近但生命周期、隐私和失败规则不同。

## Core Files

- `packages/game-core/src/systems/quest/quest-runtime-state.ts`：任务状态与生命周期。
- `quest/quest-offer-adapter.ts`、`quest-progress-adapter.ts`：任务发放与进度。
- `quest/quest-reward-dispatch.ts`：奖励派发。
- `systems/mission/generate-mission-set.ts`：开局五类使命生成。
- `mission/reforge-mission.ts`、`replace-infeasible-mission.ts`：主动重塑与世界变化替换。
- `packages/game-data/src/{quests,missions}`：静态定义和奖励池。

## Core Data

Quest 可领取、进行、完成领奖或主动放弃，玩家最多同时持有 4 个。Mission 在开局生成五个隐藏目标，完成任意三个获胜；不能主动放弃，只能重塑或因客观不可完成自动替换。

## Core Flow

事件/NPC/场景 → Quest offer → 领取 → 进度更新 → 完成 → 奖励。角色创建 → 五类 Mission 生成 → 行为推进 → 三项完成检查 → 当前结算结束后宣布胜利。

## Dependencies

依赖 events、inventory-economy、character-growth 和 game-data；session-runtime 将行为和结果接入对局。

## Important Rules

- Quest 不决定胜负；Mission 是隐藏胜利条件。
- Quest 放弃无惩罚且清空进度；Mission 已完成后永久记录。
- 世界变化导致 Mission 客观不可完成时，免费替换为同类型新使命。

## Read Strategy

改任务读 quest runtime/adapter/reward；改使命读 generate/reforge/replace。只有增加奖励类型时才展开 inventory 或 hand；不要混读两个系统的全部文件。
