# web-client

## Responsibility

浏览器端负责连接局域网服务、展示已授权快照并提交玩家操作意图。它不是规则权威，不能自行计算伤害、随机结果、移动合法性或隐藏信息。

## Core Files

- `apps/web/src/features/game-session/hex-map-board.tsx`：按玩家私有地图快照渲染可缩放、可拖动的平顶六边形地图，并对已探索相邻格复用现有移动命令。
- `apps/web/src/features/game-session/hex-map-config.ts`：地形/地点静态资源目录、切片数量与稳定变体选择；地点资源未导入时必须回退到地形。
- `apps/web/src/app/app.tsx`：顶层页面组合与当前界面入口。
- `apps/web/src/features/room/lan-room-client.ts`：Socket.IO 客户端协议封装。
- `apps/web/src/features/room/use-lan-room-lobby.ts`：大厅连接、事件订阅和界面状态协调。
- `apps/web/src/features/room/room-lobby.tsx`：大厅与角色选择 UI。
- `apps/web/src/features/game-session/game-session-panel.tsx`：运行中会话摘要，以及私有事件的揭露、放弃和选项入口。
- `apps/web/src/features/game-session/character-status-panel.tsx`：仅展示本人私有等级、属性、资源与状态。
- `apps/web/src/state/connection-store.ts`：Zustand 连接状态。

## Core Data

`LanRoomSnapshot`、`LanGameSessionSnapshot` 与 `SubmitGameCommandRequest` 来自 shared 协议。前端本地状态只保存连接和展示状态；服务端快照才是游戏事实。

## Core Flow

UI 操作 → `LanRoomClient` 发出协议请求 → 服务端确认/广播快照 → Hook 或 Store 更新 → React 渲染。

## Dependencies

依赖 `shared-contracts` 的协议，依赖 `lan-server` 提供的事件语义。需要规则说明时优先读相应模块文档，而不是把规则搬进组件。

## Important Rules

- 只能渲染当前客户端收到的权限数据；不得从公开信息推导私有信息。
- 仅提交命令，不在浏览器端决定命令是否成功。
- 事件卡内容和可用选项均使用服务端私有快照；前端不得预读取或推测隐藏效果。
- 新 UI 字符串应逐步迁入资源体系，避免扩散硬编码文本。

## Read Strategy

修改页面先读 `app.tsx` 和目标 feature。涉及 Socket 时再读 `lan-room-client.ts`、对应 shared 协议字段和服务端 transport。只有新增游戏动作或快照字段时，才进入 `session-runtime`。
