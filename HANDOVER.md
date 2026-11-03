# HANDOVER — 当前唯一任务

仓库：`dmoneyUK/three-kingdoms` · 分支：`ux-v2`
工作树：`/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` · 本地分支：`codex/ux2-judgement-seat-01`

## T6 — PUBLIC-PAC-REVEAL-ORDER-01（§10.30，含 T3 §10.33）

**当前有界步骤：**完成 §10.30(c) 中“已提交公开无懈可击/反制牌历史”的事件所有权审计，并按证据做最小修正。只处理真实公开提交牌在响应阶段的保留与归属；不得改游戏规则、牌身份、私有牌信息或已接受的 T5 私人响应提示。T6 总体仍是 **OWNER FAIL / CORRECTION REQUIRED**，尚未进入 iPhone 复验。

**上一有界步骤已实现并部署：**`84a114d27c55d08999c2f6e354a1590d0cae1579`（`fix: retain converted dismantle settlement announcement`）。其中转换过河拆桥的 H4 使用真实结算 event ID，同时保留真实技能 root 作为布局锚点；H4/PAC 等待匹配共享布局代次，REVEAL 主牌即时落位并保留 MOVE 动画。工作树已推送至 `origin/ux-v2`。

### 上一步实际验证结果（2026-11-03 UTC）

- 精确 SHA Actions：[`41557817703`](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41557817703) **SUCCESS**；API tests、Lint and fast tests、Browser startup and room smoke、deploy 全部通过。
- Cloudflare Worker 部署成功；版本 `d7bfa1d6-f751-4dbd-a197-18e5ee62b604`。Actions 生产 smoke 成功；随后 `/api/health` 返回 HTTP 200 和 `{"ok":true,"worker":"available"}`。
- `npm run build`、`git diff --check`、目标 ESLint（0 errors，13 React Hook dependency warnings）及浏览器脚本 `node --check` 通过。
- 真实四人转换拆桥浏览器场景中，出牌者视角记录到正确真实弃牌 H4 和 `shared-parked` 布局；第一次观察者采样过早、证据为空。测试已改为分别等待两个视角公告，但修订后的场景因本有界步骤的五分钟本地 UI 上限已用尽而未重跑。CI 的 browser job 是启动/建房 smoke，不覆盖这个场景；跨视角场景仍待后续证据及最终手机复验。
- 此交付不是 T6 整体完成，也不是用户验收。设计版本 `ba7ee751cb2d15cfcd406b1552cd29800451d685` 已复核；T5 §10.35 保持已接受回归边界。

### 本步骤继续边界

先从真实公开 timeline / 已提交 event 与 `PublicCardDisplayAction` 的来源追踪根牌、已提交 Negation 和反制牌在 `REVEAL → response → settlement` 的渲染所有权首次丢失处。优先用现有投影/API 测试证明事件 ID、作者、顺序与退休边界；只在证据指出具体丢失点时改代码。最多一个手机尺寸真实牌局 UI 场景，所有本地 UI/browser 尝试合计不超过五分钟。若公共事件证明缺失或归属含糊，停止并记录确切缺失字段，不从时间线顺序或客户端状态猜测。
