# HANDOVER — 当前唯一任务：§10.56 Inspector 垂直锚点返修

**状态：本地已实现 / 等待提交、精确 SHA CI 与部署。** 依据最新远端 `origin/ux-v2` `2c1a991004e229053f4b8f15aa3136b65e0043a8` 的 `docs/UX2-refine.md`（文档修订标记 2026-11-15 23:08 UTC），§10.56-F1 返修条款仍有效。Owner 拒绝的是原 §10.56 的手机垂直落点：Inspector 被 H4 推到其下方；H4 可被 Inspector 遮挡，原任务编号和横向座位锚点保持不变。

## 已知技术基线

原实现 `bae5719c054eabaf4d52bec5cf6d6f35c0d24495` 已部署；精确 SHA Actions `43758214272` 通过，Worker `4b38b1b4-877c-4e78-9957-794c2241a71d`。原 440px Inspector 回归通过，但 Owner 于 2026-11-15 23:16 UTC 指出 H4 位于所选座位与 Inspector 之间，因此该项仍未验收。最新远端 `2c1a9910` 的两笔提交仅改设计文档；已核对 §§10.56/10.60/10.59，未发现与此修复冲突。工作分支将衔接到该远端基线；此前主目录的无关本地更改未触碰。

## 当前实施边界与验证

保留所选真实 Seat、手机 4–6 人上排水平居中/视口夹取、侧列布局、H4 本身的位置/文案/生命周期/来源、公共数据隐私、关闭/Escape/TEST SWITCH/焦点行为和游戏规则。目标是空间允许时 Inspector 顶部位于所选 Hero 框底部约 8px（±2px）；H4 不能继续作为纵向避让障碍，Inspector 重叠时应叠在 H4 上方。PAC、其他座位、活动 CardFace、倒计时、Dock、手牌及交互控件仍需避让。高度不足时缩限面板并滚动内部详情；若与高优先级内容无法兼容，记录实际矩形并停止该部分。

2026-11-15 23:30 UTC：top-row 几何避让只排除 `[data-public-card-announcement=true]` 的 H4 文案；继续保留 PAC、真实卡牌、倒计时、Picker 和其他 Seat 避让。仅当 top-row Inspector 与 H4 同时存在时，将 Inspector 所在 safe-zone 提至 H4 上层；不改 H4 的盒子、内容或生命周期。扩展原 440px 浏览器场景：选中 Xiahou Dun，放入可见的 H4 位置夹层，断言 Inspector 顶部距所选 Seat 底部 `8±2px`、H4 位置/文案不变、Inspector 层高于 H4，且所有其他受保护矩形无碰撞。`timeout 240s npm run test:browser -- tests/browser/opponent-inspect-hero-focus.spec.mjs -g "§10.56 440px phone Inspector anchors under the selected top-row Seat" --workers=1`：1/1 通过，单测 7.9s；`git diff --check` 通过。当前代码尚未提交；下一步审 diff 后提交推送，验证精确 SHA 的必需 CI、Worker 部署及生产 smoke。状态仍待 Owner iPhone 复验，不自我验收。
