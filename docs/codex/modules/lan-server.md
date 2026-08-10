# lan-server

## Responsibility

提供本机启动、局域网访问的单房间 HTTP/Socket.IO 服务，负责 IP 白名单、房间大厅、连接身份与协议事件绑定。它只编排，不复制纯规则公式。

## Core Files

- `apps/server/src/index.ts`：启动数据校验、日志与 HTTP 服务。
- `server/create-lan-server.ts`：装配 Socket.IO、管理器和精确 IP 白名单。
- `transport/bind-room-socket-events.ts`：创建、加入、角色选择和开始大厅流程。
- `transport/bind-game-socket-events.ts`：请求快照、接收游戏命令与按查看者发送结果。
- `rooms/room-manager.ts`：唯一房间大厅的权威状态。
- `sessions/socket-session-manager.ts`：Socket、玩家和房间的绑定与断线状态。

## Core Data

`LanRoomSnapshot` 是大厅公开状态；`ServerSocketData` 和 Socket 会话映射确保客户端不能伪造玩家身份。`RoomManager` 与 `GameSessionManager` 都只允许一个活动实例。

## Core Flow

连接 → IP 校验 → Socket 就绪 → 大厅事件/游戏事件绑定 → 身份校验 → 调用会话服务 → 广播公开数据或发送个人快照。

## Dependencies

直接依赖 `session-runtime`、`shared-contracts` 与 `observability`；运行中的玩家变动通过回调通知 `ServerGameSession`。

## Important Rules

- 当前设计只支持一个房间和一局活动游戏。
- 白名单为精确 IP，私有配置文件不可提交 Git。
- 传输层必须从 Socket 会话取得玩家身份，不能信任请求中的玩家 ID。

## Read Strategy

改协议绑定先读对应 bind 文件与 `shared-contracts`。改房间规则先读 `room-manager.ts`。改断线先读 `socket-session-manager.ts` 与 `session-runtime`；不必阅读纯战斗或地图实现。
