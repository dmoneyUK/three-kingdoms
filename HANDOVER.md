# HANDOVER — 当前任务

仓库：`dmoneyUK/three-kingdoms` · 目标分支：`ux-v2`

工作树：`/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · 本地分支：`codex/ux2-judgement-seat-01`

最新设计已复习：`docs/UX2-refine.md`，修订提交 `54d42b9ceef944ab517a22a1cd1676a03612c069`（2026-11-03 00:34 UTC）。T5 私有响应指引已由用户接受并关闭；T6 §10.30 公共布局、转换结果及反制历史仍未完成及未验收。

## 当前唯一有界任务 — T6 PUBLIC-PAC-REVEAL-ORDER-01（§10.30）

**本步骤状态：IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW。整个 T6 仍在进行，未获用户验收，也尚未达到合并手机复验条件。** 保留已接受的 T5 指引作为回归约束，不重新开启 T5。

**已交付步骤：** 真实公开卡牌从 REVEAL → MOVE → PARKED 时，CardFace、H4、PAC、倒计时共享阶段身份。MOVE 保留经验证的 H4 落点和真实卡牌动画；PARKED 根据卡牌实际落点避让，将 H4 重新放入安全的舞台居中区域。卡牌身份、真实作者停放目标、PAC 与倒计时不因 H4 重排而改变。本步骤没有改变公开反制历史归属。

**本地验证：** 纯布局测试 **6/6 通过**；目标 ESLint **0 错误**（`app/public-card-display.tsx` 中 13 条既存 hooks 依赖警告）；`npm run build` 通过（有既存包体积与 API 分类提示）；`git diff --check` 通过。一个既有真实对局浏览器场景在 **390×844** 下 **1/1 通过，用时 14.1 秒**，确认三阶段共用布局身份、PARKED H4 居中且不遮挡卡牌/PAC/倒计时，卡牌抵达实际目标。该任务的本地 UI 测试总时长低于 5 分钟。

**代码与线上验证：** 实现已推送到 `ux-v2`，提交 [`f9e43b32a4e318d3d39bbf4a2c0d6199d18db992`](https://github.com/dmoneyUK/three-kingdoms/commit/f9e43b32a4e318d3d39bbf4a2c0d6199d18db992)。精确 SHA [Actions run 41554425229](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41554425229) 于 2026-11-03 00:44 UTC 成功：lint/fast tests、API tests、browser startup/room smoke、Worker deploy、production smoke 均通过。Worker 版本 `c5328323-5498-4110-ad87-dc92a813e1d1`；2026-11-03 00:44 UTC 直接访问生产 `/api/health` 返回 HTTP 200，`{"ok":true,"worker":"available"}`。

**下一安全边界：** 在这一交付记录提交后，按 §10.30 顺序继续同一个 T6：先完成原 T3 §10.33 中的转换后 Dismantle 结算 H4 证明修正。沿服务器已提交事件链配对真实有效牌、原始物理材料、root/interaction/frame/target 与最终弃牌；普通 Dismantle 继续有效，转换牌缺少或不匹配证明时不得生成结算。保留原物理 CardFace 与手牌隐私。该步骤部署后再审计公开反制历史的首次渲染所有权丢失点；不得根据当前 GROUP_RESOLUTION/Negation 场景猜测归属。T6 全部修正部署后再准备一次合并 iPhone 复验；不得宣称 USER-ACCEPTED。
