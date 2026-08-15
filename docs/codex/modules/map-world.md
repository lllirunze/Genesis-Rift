# map-world

## Responsibility

管理平顶六边形地图、立方坐标、高度、地形、区域、探索、视野、普通移动、特殊连接与强制位移。

## Core Files

- `packages/game-core/src/systems/map/model/hex-map.ts`：地图与地块模型。
- `map/geometry/cube-coordinate.ts`：坐标合法性、距离与方向基础。
- `map/movement/settle-normal-movement.ts`：普通移动完整结算。
- `map/movement/movement-cost-policy.ts`：基础、地形与坡度成本。
- `map/vision/calculate-current-vision.ts`：视野与已探索规则。
- `packages/game-data/src/maps/map-content-definitions.ts`：地形、区域、地块内容配置。

## Core Data

`HexMap` 由带坐标、高度、地形、区域和通行性的地块组成。玩家地图状态保存当前位置和个人探索记录；未知地块不可进入视野，也不应通过私有地图快照泄露其内容。

## Core Flow

方向输入 → 邻接地块/连接候选 → 通行与高度检查 → 成本计算 → 首次探索与到达结算 → 更新位置、探索和剩余移动力。

## Dependencies

environment-random 提供天气/昼夜规则；session-runtime 保存玩家位置和回合移动力；events 与 revival-contract 可能改变地图或出生点。

## Important Rules

- 使用平顶六边形六方向命名与立方坐标 `x+y+z=0`。
- 首次探索会结束本回合剩余移动；移动可向任意方向，不再限制顺时针。
- 高差过大禁止移动；上坡使用平方额外成本，目标地形最多额外加 2。
- 默认对局地图使用固定坐标规则混合平原、森林、山地、水域、沙漠与雪地；城镇、村庄、神殿、港口和遗迹可用专属完整地块覆盖基础地形视觉，不能为地图内容读取共享随机流。

## Read Strategy

坐标/方向任务先读模型；普通移动读 settlement 与 cost policy；视野任务只读 vision。只有涉及天气或服务端命令时才展开环境或会话模块。
