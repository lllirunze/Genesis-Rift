# combat

## Responsibility

提供单次攻击、主动防御、自然闪避、物理/法术/真实伤害、暴击、护盾、生命、击倒、生存、状态和技能的统一规则与结算接口。

## Core Files

- `packages/game-core/src/systems/battle/attack/resolve-attack.ts`：标准攻击规则链。
- `battle/damage/calculate-damage.ts`：攻击值、防御、穿透与伤害计算。
- `battle/evasion/resolve-evasion-check.ts`、`critical/resolve-critical-check.ts`：概率判定。
- `battle/status/character-status-state.ts`：状态实例生命周期。
- `battle/settlement/battle-settlement.ts`：战斗记录、后续通知与奖励接口。
- `battle/encounter/encounter-runtime-state.ts`：事件创建的敌对遭遇实例与生命状态。
- `systems/skill/use-active-skill.ts`：主动技能的资格、消耗与效果执行。

## Core Data

攻击、伤害、状态、技能和生存各有独立运行时模型。角色最终属性由 character-growth 提供；武器攻击力作为攻击源数据独立参与计算。

## Core Flow

攻击资格 → 消耗行动/移动 → 主动防御 → 防守方闪避 → 攻击/有效防御/伤害 → 暴击 → 护盾与生命 → 击倒/死亡 → 结算通知和奖励。

## Dependencies

依赖 character-growth、inventory-economy、environment-random 和 session-runtime。hand 可以在响应窗口提供效果，revival-contract 接续正式死亡。

## Important Rules

- V1 只考虑防守方闪避，不存在攻击方命中率。
- 成功命中至少造成 1 点伤害；护甲、魔抗与穿透是小数值属性。
- 普通攻击不自动反击，反击必须由明确效果触发。
- 状态的默认层数为 1；仅可叠层状态增长层数，永久状态以很大回合数表示。

## Read Strategy

改伤害只读 attack/damage/evasion/critical。改状态只读 `battle/status` 和修饰器接口。改会话接入再读 `ServerGameSession`；无需展开手牌或任务，除非实现其后续通知。
