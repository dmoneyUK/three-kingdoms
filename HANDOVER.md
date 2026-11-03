# HANDOVER — 当前任务

仓库：`dmoneyUK/three-kingdoms` · 目标分支：`ux-v2`

工作树：`/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · 本地分支：`codex/ux2-judgement-seat-01`

最新设计已复习并同步：`docs/UX2-refine.md`，远端设计提交 `54d42b9ceef944ab517a22a1cd1676a03612c069`（2026-11-03 00:34 UTC）。本次设计更新关闭并接受了 T5 私有响应指引；T6 §10.30 的公共布局、转换结果和公开反制历史要求仍待完成及手机复验。最新远端代码提交仍为 `b49becadc42909c55dd36de0d106da772d9d6d8f`，之后的 `dbf63f1` 与 `54d42b9` 为文档提交。

## 当前唯一有界任务 — T6 PUBLIC-PAC-REVEAL-ORDER-01（§10.30）

**状态：实现进行中；本步骤尚未提交、CI 未运行、未部署；未获用户验收。** 保留 T5 已通过的私有响应指引作为回归要求，不将其重新列为待验收功能。

**当前步骤：** 让真实公开卡牌在 REVEAL → MOVE → PARKED 三阶段与 CardFace、H4、PAC、倒计时共享同一阶段身份。MOVE 保持已验证的 H4 位置和真实卡牌动画；PARKED 按卡牌实际落点避让并将 H4 放回安全的舞台居中区域。卡牌身份、作者落点、PAC 与倒计时不因 H4 重排而变化。本步骤不改公开反制历史归属。

**本地实现与验证 — 2026-11-03 00:38 UTC：** 修改 4 个实现文件和 2 个既有测试文件，共 6 个文件。纯布局测试 **6/6 通过**；目标 ESLint **0 错误**（`app/public-card-display.tsx` 有 13 条既存 hooks 依赖警告）；`npm run build` 通过（保留既有包体积和 API 分类提示）；`git diff --check` 通过。一个既有真实对局浏览器场景在 **390×844** 下通过 **1/1**，用时 **14.1 秒**，观察到 REVEAL、MOVE、PARKED 身份一致，PARKED H4 居中且不遮挡卡牌、PAC、倒计时；实体卡停在实际目标。所有本地浏览器测试合计少于 5 分钟。当前改动尚无 exact-SHA CI、部署或生产健康检查结果。

**最近已部署的 T6 基线：**

- 共享 REVEAL 几何：提交 `16468f5e713a0c68bd9d4e1a45e6deb897bc1854`；exact-SHA [Actions 41550956280](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41550956280) 成功；Worker `285c94ea-b1fc-4261-a754-ddec38b77306`；当时 `/api/health` HTTP 200。
- 倒计时纳入同一 REVEAL 布局身份：提交 `b49becadc42909c55dd36de0d106da772d9d6d8f`；exact-SHA [Actions 41551875970](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41551875970) 成功；Worker `9acbd612-68d2-45cf-b340-90bfa3920fa8`；当时 `/api/health` HTTP 200。

**下一安全边界：** 本步骤 exact-SHA CI、部署和健康检查通过后，再单独审计并修复真实已提交公开反制卡牌的历史保留与渲染所有权；先追到首个丢失渲染所有权的阶段，不猜测事件语义。T6 全部修正部署后，才准备一次合并 iPhone 复验；不宣称 USER-ACCEPTED。
