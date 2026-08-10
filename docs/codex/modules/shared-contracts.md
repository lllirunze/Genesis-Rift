# shared-contracts

## Responsibility

为前端、服务端、规则和数据包提供最底层的稳定类型、资源 ID、通用配置与网络协议。这里的变更通常是跨包 API 变更。

## Core Files

- `packages/shared/src/protocol/lan-events.ts`：Socket 事件、请求、快照与公开领域事件。
- `types/ids.ts`：游戏、房间、玩家、地块等标识类型。
- `types/attributes.ts`：基础属性和派生属性公式契约。
- `types/character-resources.ts`：运行时资源定义契约。
- `config/quality-config.ts`：通用品质体系。
- `config/resource-id-config.ts` 与 `validation/resource-id.ts`：资源 ID 规则。

## Core Data

协议快照区分公开 `players` 和私有 `viewer`。静态资源 ID 使用 `<type>_<6位数字>`；职业、种族等有限枚举除外。

## Core Flow

shared 类型 → game-core/data 采用 → server 组装或验证 → web 发送/渲染。

## Dependencies

没有项目内部依赖；所有其他工作区均可能依赖它。

## Important Rules

- 不将具体业务名称、品质或子类型编码进资源 ID。
- 任何协议字段都必须明确公开范围，私有字段只能置于 `viewer` 或专门的单播事件。
- 改动前必须搜索该符号的跨包消费者。

## Read Strategy

仅在新增跨端数据、命令、ID 或通用类型时阅读。字段增加后再按搜索结果读取服务端投影和前端消费者；不要因此扫描全部业务模块。
