import type { LanGamePrivateCharacterSnapshot } from "@genesis-rift/shared";

/** 描述角色状态面板所需的本人私有角色快照。 */
export interface CharacterStatusPanelProps {
  readonly character: LanGamePrivateCharacterSnapshot | null;
}

/**
 * 方法名：CharacterStatusPanel
 * 作用：展示仅属于当前玩家的等级、属性、资源和状态效果，不参与任何数值计算。
 * @param props 服务端按查看者裁剪后的角色私有快照。
 * @returns 当前玩家的角色状态面板。
 */
export function CharacterStatusPanel(props: CharacterStatusPanelProps) {
  if (props.character === null) {
    return (
      <section className="character-status-panel" aria-labelledby="character-status-heading">
        <div className="character-status-panel__heading">
          <div>
            <p>Character Status</p>
            <h3 id="character-status-heading">角色状态</h3>
          </div>
        </div>
        <p className="character-status-panel__empty">正在等待服务器发送你的角色状态。</p>
      </section>
    );
  }

  const primaryAttributes = Object.entries(props.character.currentPrimaryAttributes);
  const derivedAttributes = Object.entries(props.character.derivedAttributes);
  const resources = Object.entries(props.character.resources);

  return (
    <section className="character-status-panel" aria-labelledby="character-status-heading">
      <div className="character-status-panel__heading">
        <div>
          <p>Character Status</p>
          <h3 id="character-status-heading">角色状态</h3>
        </div>
        <div className="character-status-panel__level" aria-label="等级与经验">
          <span>Lv.{props.character.level}</span>
          <strong>{props.character.experience} XP</strong>
        </div>
      </div>

      <section
        className="character-status-panel__section"
        aria-labelledby="character-resources-heading"
      >
        <h4 id="character-resources-heading">运行时资源</h4>
        <dl className="character-resource-grid">
          {resources.map(([resourceId, resource]) => (
            <div key={resourceId}>
              <dt>{getResourceLabel(resourceId)}</dt>
              <dd>
                {resource.current} <span>/ {resource.maximum}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="character-status-panel__columns">
        <section
          className="character-status-panel__section"
          aria-labelledby="primary-attributes-heading"
        >
          <h4 id="primary-attributes-heading">基础属性</h4>
          <dl className="character-attribute-list">
            {primaryAttributes.map(([attribute, value]) => (
              <div key={attribute}>
                <dt>{getPrimaryAttributeLabel(attribute)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="character-status-panel__section"
          aria-labelledby="derived-attributes-heading"
        >
          <h4 id="derived-attributes-heading">派生属性</h4>
          <dl className="character-attribute-list">
            {derivedAttributes.map(([attribute, value]) => (
              <div key={attribute}>
                <dt>{getDerivedAttributeLabel(attribute)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section
        className="character-status-panel__section"
        aria-labelledby="character-status-effects-heading"
      >
        <h4 id="character-status-effects-heading">状态效果</h4>
        {props.character.statuses.length === 0 ? (
          <p className="character-status-panel__empty">当前没有生效中的状态效果。</p>
        ) : (
          <ul className="character-status-effect-list">
            {props.character.statuses.map((status) => (
              <li key={status.instanceId}>
                <strong>{status.definitionId}</strong>
                <span>
                  层数 {status.currentStacks} · 剩余 {status.remainingTurns} 回合
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

/** 将资源标识转换为当前界面的简短中文名称。 */
function getResourceLabel(resourceId: string): string {
  if (resourceId === "health") {
    return "生命";
  }

  return resourceId;
}

/** 将五维基础属性标识转换为中文名称。 */
function getPrimaryAttributeLabel(attribute: string): string {
  const labels: Readonly<Record<string, string>> = {
    strength: "力量",
    constitution: "体质",
    spirit: "灵力",
    agility: "敏捷",
    insight: "悟性",
  };

  return labels[attribute] ?? attribute;
}

/** 将当前已定义的派生属性标识转换为中文名称。 */
function getDerivedAttributeLabel(attribute: string): string {
  const labels: Readonly<Record<string, string>> = {
    maxHealth: "最大生命",
    healthRegeneration: "生命恢复",
    movementRange: "移动力",
    physicalAttack: "物理攻击",
    physicalDefense: "护甲",
    evasionRate: "闪避率",
    criticalRate: "暴击率",
    criticalDamage: "暴击伤害",
    armorPenetration: "护甲穿透",
  };

  return labels[attribute] ?? attribute;
}
