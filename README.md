# 开天辟地之大地的裂变

一个致敬《爱情公寓》第三季同名桌游设定的局域网多人网页桌游项目。

项目当前采用 React、Node.js 与 TypeScript，以“规则核心独立、服务端权威、配置数据驱动”为基础搭建工程。当前阶段只完成代码结构框架，尚未实现具体游戏规则和玩家交互。

## 技术栈

- React + Vite：网页客户端。
- Node.js + Socket.IO：局域网房主服务与实时传输入口。
- TypeScript：客户端、服务端、规则与协议统一类型。
- Zustand：客户端本地界面状态。
- Vitest：规则与工具测试。
- npm workspaces：单仓多包管理。

## 工程结构

```text
Genesis-Rift/
├── apps/
│   ├── web/                # React 网页客户端
│   └── server/             # Node.js 局域网权威服务
├── packages/
│   ├── game-core/          # 与 UI 和网络无关的纯规则核心
│   ├── game-data/          # 地图、身份、装备、事件等配置
│   └── shared/             # 跨端 ID、坐标和通信协议类型
├── docs/
│   ├── 概念设计/           # 游戏设计文档
│   └── 代码开发规范/       # 代码规范与工程结构说明
├── package.json            # 工作区与统一脚本
└── tsconfig.base.json      # TypeScript 共享配置
```

详细职责见[工程目录结构](docs/代码开发规范/02-工程目录结构.md)。

## 本地启动

安装依赖：

```bash
npm install
```

启动局域网服务端：

```bash
npm run dev:server
```

启动网页客户端：

```bash
npm run dev:web
```

同一局域网内的其他设备可以通过房主设备的局域网IP访问前端端口。当前尚未实现房间创建、玩家加入与状态同步。

## 质量检查

```bash
npm run typecheck
npm test
npm run build
npm run format:check
```

## 当前边界

当前框架不包含：

- 具体战斗、移动、事件和使命逻辑；
- 房间、玩家身份与多人同步流程；
- 数据库、账号和公网部署；
- Phaser地图渲染；
- 正式游戏配置资源。

后续应优先从`packages/game-core`实现可独立测试的规则，再由`apps/server`调用规则并向`apps/web`同步结果。
