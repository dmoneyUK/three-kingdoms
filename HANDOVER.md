# HANDOVER — 当前唯一任务：§10.63 选中手牌绘制层高于技能层

## 最近交付结果

§10.62 H4 认证玩家姓名片段修正已实现并部署，待 Owner iPhone 复验：commit `d10fd75f995558f4f780e8ed5be90fdac83b1103`；精确 SHA Actions [43983882142](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43983882142) 全绿，API、Lint/Fast、浏览器 smoke、D1 migration、Worker deploy 和生产 smoke 均通过。Worker `8b4fa728-e0a9-4689-9725-1d5bb9051908`；生产首页与 `/api/health` 均返回 HTTP 200。未运行本地测试、构建或浏览器/设备验证。

## 当前任务：§10.63 LOCAL-SELECTED-HAND-ABOVE-SKILL-01

依据最新 `docs/UX2-refine.md`（revision `2026-11-16 21:51 UTC`，设计 commit `c82c15d901f2340e57594dd08408ca638ed10fff`）。Owner iPhone 证据显示选中手牌覆盖 Cao Cao/TREACHERY 时，技能文字与边框仍绘制在卡面上方。现有规则把 `.local-hand-section` 与 `.local-hand` 设为 `z-index:auto`，只提升原生滚动层的子层级，不能保证 iPhone WebKit 中整张真实卡牌绘制于技能之上。

按设计将选中态的共享 `.local-hand-section` 提升为明确的叠放上下文，确保整张真实 CardFace 在技能层上方；保留原生横向滚动、当前卡牌 ID/点击与反选、未被卡牌覆盖的技能和装备点击区域。禁止复制卡牌、遮盖技能文字、改规则或重构 §10.61 选择语义。Owner 要求不运行本地测试、构建或设备测试；只做 `git diff --check`，提交推送后核验精确 SHA CI、Worker 部署和生产 smoke。真实 iPhone 复验由 Owner 完成，不得自行标记验收。
