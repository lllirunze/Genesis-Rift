# 轻量架构索引

## 代码层级

`packages/shared` 位于最底层，定义 ID、属性、品质、资源与 Socket.IO 协议。`packages/game-core` 依赖 shared，按系统提供纯数据模型、校验和规则函数；它不读取文件、不写日志、不依赖 React 或服务端。`packages/game-data` 提供身份、种族、地图、物品、事件等静态配置，并在服务端启动时统一校验。`apps/server` 将配置与规则装配为唯一权威会话；`apps/web` 只通过协议与服务端交互。

## 服务端与数据流

`apps/server/src/index.ts` 启动前校验数据并创建日志，再由 `server/create-lan-server.ts` 组装 HTTP、Socket.IO、精确 IP 白名单、房间、连接和游戏会话管理器。大厅事件由 `transport/bind-room-socket-events.ts` 处理；游戏命令由 `transport/bind-game-socket-events.ts` 绑定玩家身份后交给 `game/GameCommandService`。

命令流为：浏览器请求 → Socket 传输层 → `GameCommandService` → `ServerGameSession` → `game-core` 规则函数 → 新的 `GameSessionState` → 权威快照与领域事件。`ServerGameSession` 是服务端业务编排中心：维护回合、连接/断线、移动、攻击、轮回和已有物品命令，并按查看者生成快照。公开快照可广播；私有 `viewer` 区域只能发送给本人。

## 前端与状态

`apps/web/src/app/app.tsx` 组合页面。房间功能位于 `features/room`，`LanRoomClient` 负责协议收发，`use-lan-room-lobby` 将事件映射到界面，`state/connection-store.ts` 保存连接状态。`features/game-session` 当前展示公开会话摘要。前端不保存或推导权威游戏规则；新增界面应先确认 shared 协议是否已有所需快照或命令。

## 规则与配置

规则按领域位于 `packages/game-core/src/systems/*`。跨系统会话结构在 `core/game/game-session-state.ts`，是理解服务端会话编排时的优先入口。静态配置位于 `packages/game-data/src/<domain>/`，由 `validation/validate-game-data.ts` 汇总。新增配置应先确认 core 定义，再写 data 配置及验证测试；不要把固定数据写进服务端服务。

## 定位建议

界面问题先看 `apps/web` 与 shared 协议；网络/权限/命令问题先看 `apps/server/src/transport`、`game`、`sessions`；纯业务规则先看相应 `game-core/systems` 模块；配置数值或资源内容先看 `game-data`。跨端字段变化必须同时检查 shared 协议、服务端投影和前端消费者。详细入口见 `MODULE_INDEX.md`。
