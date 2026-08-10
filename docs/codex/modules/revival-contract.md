# revival-contract

## Responsibility

管理正式死亡后的灵魂状态、D20 轮回、中途加入、轮回保护、死亡遗物包和隐藏神鬼契约。

## Core Files

- `packages/game-core/src/systems/revival/soul-state.ts`：灵魂等待与轮回保底状态。
- `revival/reincarnation-roll.ts`、`complete-reincarnation.ts`：判定与恢复。
- `revival/death-relic-runtime-state.ts`、`pick-death-relic-from-runtime.ts`：遗物包开放与拾取。
- `revival/complete-mid-game-join.ts`：中途加入成功后的初始恢复。
- `packages/game-core/src/systems/contract/contract-runtime-state.ts`：契约的隐藏永久状态。

## Core Data

死亡后角色保留职业、等级、使命、图纸等长期成长，进入灵魂。轮回等待 3 个回合后投 D20，掷出 6 成功，失败有保底。遗物包只包含随机损失的物品；临时拾取区内容直接丢失。

## Core Flow

正式死亡 → 损失结算/遗物包 → 灵魂等待 → D20/保底 → 随机安全城镇或村庄出生点 → 部分资源恢复 → 3 回合保护。中途加入从轮回骰阶段进入。

## Dependencies

依赖 combat 的死亡结果、inventory-economy 的物品/元宝、map-world 的安全出生点、environment-random 的 D20 和 session-runtime 的回合接入。

## Important Rules

- 轮回保护期间不能主动攻击，主动敌对行为立即解除。
- 遗物包开放 10 个回合，每个玩家有拾取上限；到期内含物品直接消失。
- 神鬼契约是隐藏游戏内数据，不能通过上帝私下修改概率实现。

## Read Strategy

改轮回读 soul/roll/complete；改遗物读 death-relic 文件；改服务端接入才读 `ServerGameSession`。不要把点卡场外彩蛋实现为经济系统代码。
