# environment-random

## Responsibility

为所有随机结果提供可复现的主种子和独立随机流，并管理昼夜、54 张天气牌、天气效果、灾害和每轮环境推进。

## Core Files

- `packages/game-core/src/systems/random/core/random-manager.ts`：主种子与随机流管理。
- `random/core/random-stream.ts`、`random/service/dice.ts`：整数随机、权重与骰子。
- `systems/environment/settle-environment-round.ts`：统一环境回合结算。
- `environment/weather/weather-deck.ts`：天气牌库与回收。
- `environment/weather/resolve-active-weather-effects.ts`：读取有效天气影响。
- `packages/game-data/src/weather/weather-config.ts`：天气、扑克牌与灾害配置。

## Core Data

每局只生成一个安全主种子，再派生战斗、掉落、事件、天气等独立流。环境状态包含昼夜阶段、天气牌库、有效天气和灾害。幸运值只修正个人收益权重，不改变随机种子或世界随机。

## Core Flow

主种子 → `RandomManager` → 指定模块随机流 → 整数/权重/骰子结果。回合推进 → 昼夜推进 → 天气抽取/持续 → 灾害 → 公共环境视图。

## Dependencies

game-data 提供配置；map-world、events、combat、hand 使用规则结果；session-runtime 在回合结束时调用环境结算。

## Important Rules

- 禁止业务模块自行创建随机对象或使用 `Math.random`。
- 不生成浮点随机数；需要比例时基于整数结果计算。
- 一个模块增加随机调用不能影响其他模块的序列。

## Read Strategy

改骰子或随机读 random；改天气读 environment/weather 与 weather data；只有影响移动、视野或事件时，再读取相应直接消费者。
