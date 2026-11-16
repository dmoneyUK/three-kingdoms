# HANDOVER — 当前唯一任务：§10.63

## 最近结果：§10.62

**IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW。** 修复 Negation 与 Dismantle H4 的已验证玩家名片段。代码提交 `61bc60a53ca4dfcf7ddb145c2a79d0c6b28407a2`；精确 SHA Actions [43969554427](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43969554427) 全部必需作业通过。定向 Node 测试 `67/67` 通过，`git diff --check` 通过。Worker version `5302fb17-94d0-4647-81f2-429fe70709fd`；生产首页与 `/api/health` smoke 通过。未运行本地手机或浏览器验收；等待 Owner iPhone 复验。

## 当前任务：§10.63 LOCAL-SELECTED-HAND-ABOVE-SKILL-01

按 Owner 最新直接顺序，在 §10.62 后先执行本项。设计依据 `docs/UX2-refine.md` revision `2026-11-16 21:51 UTC`，设计提交 `c82c15d901f2340e57594dd08408ca638ed10fff`。

修复四人局本地 Dock 中被选中的真实手牌与武将技能重叠时，技能文字/边框仍绘制在卡牌上方的问题。必须保持单张真实 CardFace、原有选择/再次点击取消行为、未遮挡技能与装备的点击能力，以及 §10.60 已通过的原生横向滑动和首尾牌可达性。不改合法行动、卡牌身份、隐私、游戏规则或其他展示行为；不得以单纯增加子元素 z-index、复制卡牌、遮盖技能或扩大透明拦截区替代真正的选中卡视觉层级。

### 当前实现进度

- 已让处于选中/聚焦状态的原生手牌滚动容器成为确定的 `z-index:80` 绘制层，高于技能按钮的 `z-index:70`；滚动容器自身穿透点击，只让真实卡槽接收点击。横向 `overflow-x:auto`、`touch-action:pan-x` 和滚动容器结构保持不变。
- 增加了单一四人局 Cao Cao / Treachery / Kirin Bow 浏览器回归场景，CI 会附带卡牌与技能重叠区截图，并核对卡牌命中、未遮挡技能/装备命中、再次点击取消及滚动样式。该场景已加入部署所需的 browser smoke。
- 按 Owner 指示未在本地运行手机或浏览器测试；CI 尚未运行。当前修改仍未提交，下一步只做差异检查，然后提交推送并核验精确 SHA CI、Worker 与生产 smoke。结果保持 **PENDING OWNER iPHONE REVIEW**。此项完成后按 Owner 顺序进入 §10.61，再执行 §10.57。
