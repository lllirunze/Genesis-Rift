import { ARCHITECTURE_LAYERS } from "./architecture-layer-config.ts";

/**
 * 方法名：App
 * 作用：渲染网页应用的根组件。
 * @returns 本次处理得到的结果。
 */
export function App() {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Genesis Rift · LAN tabletop framework</p>
        <h1>开天辟地之大地的裂变</h1>
        <p className="hero-copy">
          React 负责玩家界面，Node.js 负责局域网权威状态，纯 TypeScript 规则核心保持独立。
        </p>
        <div className="status-row" aria-label="工程状态">
          <span>工程骨架已建立</span>
          <span>具体规则待实现</span>
          <span>多人交互待设计</span>
        </div>
      </section>

      <section className="architecture-section" aria-labelledby="architecture-heading">
        <div className="section-heading">
          <p>Architecture map</p>
          <h2 id="architecture-heading">五层职责，单向依赖</h2>
        </div>

        <div className="layer-grid">
          {ARCHITECTURE_LAYERS.map((layer, index) => (
            <article className="layer-card" key={layer.name}>
              <span className="layer-index">0{index + 1}</span>
              <p className="layer-path">{layer.path}</p>
              <h3>{layer.name}</h3>
              <p>{layer.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
