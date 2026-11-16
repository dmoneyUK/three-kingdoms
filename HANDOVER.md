# HANDOVER — 当前唯一任务：§10.63 LOCAL-SELECTED-HAND-ABOVE-SKILL-01

**上一交付：** §10.62 已部署，SHA `7d3ec863ccfe87d4c47b42a1afe31295e0b04bd3`；Actions `43941924716` 全通过，Worker `e6892e5c-bb6e-41dd-82ac-dea6c550f3af`，生产 smoke 通过。§10.62 等待用户 iPhone 验收。

## 当前任务

**状态：实现已推送，CI 修正进行中。** 依据 `docs/UX2-refine.md` revision `2026-11-16 19:15 UTC`。提交 `46c5c3334013d03db0c599b6595ef0c28aecb385` 仅在真实选中、详情或检查态取消 hand-section、hand、scroll rail 的中间堆叠上下文；原始选中 CardFace 按自身 z-index 越过它覆盖的技能按钮像素。保留 scroll rail 的 `pointer-events:auto`、`overflow-x:auto` 和 `touch-action:pan-x`，未遮挡的技能/装备按钮继续命中。

**运行时证据：** 440×844 手机视口中，选中牌与 Influencing 重叠约 41.5×33px。修复前重叠点命中技能按钮；修复后命中真实选中牌；牌外但仍位于 rail 区域的技能点命中 Influencing，装备按钮也命中自身。

**验证：** 聚焦浏览器场景通过：选中/反选、层叠命中、scroll rail 内未遮挡的技能点及装备按钮命中、原生横滑、末张完整可见且滑动未误选。该单场景 4 次运行总计约 36 秒（含一次选位校正、一次预期基线复现及两次最终通过），低于 5 分钟；`git diff --check` 通过。Actions `43944931662` 精确验证 SHA `46c5c333`：Lint/build/API/浏览器 smoke 通过；`test:fast` 因 `tests/room-safety-render.test.mjs` 的 CSS 正则先命中新的 scoped rail override 而失败，部署跳过。已将静态检查锚定到基础 rail 规则，并增加三个新状态层级断言；待提交修正并重跑精确 SHA CI。未运行其他本地测试、构建或设备测试。

**边界：** 无玩法/权限改动；§10.60 原横滑验收保持；部署后仍需用户 iPhone 验收。不得标记 USER-ACCEPTED。
