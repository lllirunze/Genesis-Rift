# LAN Server

Node.js局域网权威服务。未来负责房间、会话、命令校验、规则执行和权限过滤。

当前提供`/health`健康检查、Socket.IO入口、协议版本握手和精确 IP 白名单校验。

局域网访问者必须在不提交至 Git 的`config/allowed-client-ips.local.json`中精确列出。请先复制`config/allowed-client-ips.example.json`，再加入需要参与游戏的设备 IP。配置缺失时默认只允许本机`127.0.0.1`与`::1`；未授权 HTTP 请求返回`403` JSON，未授权 Socket.IO 连接会在握手阶段被拒绝，Vite 开发网页服务也读取该本地配置。
