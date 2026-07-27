# Character Portraits

存放玩家创建角色时可以选择的人物立绘。

目录按照“性别 → 种族”组织：

```text
portraits/
├── male/
│   ├── human/
│   ├── divine/
│   ├── demon/
│   └── yokai/
└── female/
    ├── human/
    ├── divine/
    ├── demon/
    └── yokai/
```

目录名称对应关系：

| 目录      | 含义           |
| --------- | -------------- |
| `male/`   | 男（Male）     |
| `female/` | 女（Female）   |
| `human/`  | 人族（Human）  |
| `divine/` | 神族（Divine） |
| `demon/`  | 魔族（Demon）  |
| `yokai/`  | 妖族（Yokai）  |

同一性别与种族下的立绘直接按照对应职业的资源名称命名：

```text
mage.avif
assassin.avif
thief.avif
ranger.avif
demon.avif
matriarch.avif
```

当前妖族女性立绘的文件名与职业对应关系如下：

| 文件名           | 对应职业 |
| ---------------- | -------- |
| `mage.avif`      | 法师     |
| `assassin.avif`  | 杀手     |
| `thief.avif`     | 盗贼     |
| `ranger.avif`    | 游侠     |
| `demon.avif`     | 魔王     |
| `matriarch.avif` | 神仙长老 |

立绘默认使用AVIF格式，以降低网页加载体积。所有候选立绘应尽量保持相同画布尺寸、人物比例、脚底基线和安全区域，方便角色选择界面统一展示。

文件名不再重复包含立绘、性别和种族，因为这些信息已经由资源类型与目录表达。界面和配置应直接使用以上职业资源名称构造路径，不应在代码中继续引用旧的`portrait-*`名称。

若同一性别、种族与职业后续存在多套可选立绘，应在职业名后增加具有实际含义的变体名称，而不是仅使用无语义编号。
