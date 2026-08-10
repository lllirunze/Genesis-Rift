# observability

## Responsibility

提供统一结构化日志记录、格式化、异步文件保存、50 MB 轮转与异常降级。它服务调试与复盘，不替代领域事件或存档。

## Core Files

- `apps/server/src/logging/logger.ts`：日志写入门面。
- `logging/log-record.ts`：记录与目标信息模型。
- `logging/log-formatter.ts`：固定宽度文本格式。
- `logging/file-log-writer.ts`：异步写入、`latest.log` 与轮转。
- `logging/log-config.ts`：目录、文件前缀、编码和容量配置。
- `logging/create-server-logger.ts`：服务端日志实例装配。

## Core Data

日志格式为时间、等级、对象、功能、模块和英文消息。无玩家对象使用 `-------`。日志文件保存于根目录 `logs/`，采用 UTF-8 和 `game_yyyyMMdd_HHmmss_SSS.log` 命名。

## Core Flow

业务服务 → `Logger` → `LogRecord` → formatter → writer 队列 → 当前历史文件与 `latest.log`。写入失败仅降级到控制台，不能通过日志系统再次记录自身错误。

## Dependencies

不依赖业务规则。lan-server 在启动时创建 logger，服务端编排服务按需要注入。

## Important Rules

- 禁止直接 `console.log`；异常降级场景除外。
- 消息使用完整英文句子，注释与 TSDoc 使用中文。
- `logs/` 是运行数据，不提交 Git。

## Read Strategy

业务新增日志只读 `logger.ts` 和同模块已有调用。只有改格式、轮转或存储时才读 formatter/writer/config；不必阅读任何游戏规则。
