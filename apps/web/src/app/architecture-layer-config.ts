import type { ArchitectureLayer } from "./architecture-layer.ts";

export const ARCHITECTURE_LAYERS = [
  {
    name: "网页客户端",
    path: "apps/web",
    description: "显示棋盘与面板、收集玩家输入，不裁定最终规则。",
  },
  {
    name: "局域网服务",
    path: "apps/server",
    description: "作为房主权威进程，未来负责房间、同步与命令校验。",
  },
  {
    name: "规则核心",
    path: "packages/game-core",
    description: "保存与 React、网络和数据库无关的状态、命令及规则系统。",
  },
  {
    name: "游戏配置",
    path: "packages/game-data",
    description: "保存地图、身份、装备、事件和使命等可校验静态资源。",
  },
  {
    name: "共享协议",
    path: "packages/shared",
    description: "维护客户端与服务端共同使用的 ID、坐标和通信事件类型。",
  },
] as const satisfies readonly ArchitectureLayer[];
