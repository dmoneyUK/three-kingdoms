# HANDOVER — 当前唯一执行任务

## ZHOU-YU-FANJIAN-UX-01 / §10.37

**状态：本地实现和聚焦验证完成；待提交、精确 SHA CI/Worker 部署及 Owner iPhone 复审。未验收。** 工作树分支 `codex/ux2-judgement-seat-01`，基线/当前 `origin/ux-v2` 为 `42c89d9e8db5d36fde7be8cd34e63d1dfdd6bc1f`。依据远端设计修订 `2026-11-05 23:50 UTC` §10.37。保留已验收 E16 的真实单牌 REVEAL→MOVE→PARKED 与 HAND→HAND；未改游戏规则、合法性或隐私。

### 已实现

- Fanjian 使用一个紧凑组合选择面板：四个仅显示花色符号的可访问按钮、紧邻的 Hand 数量和匿名牌背；前四张完整显示，其余横向滑动；单次 Confirm。保留选择重按取消和旧 `suit`/`card` 进行中兼容。
- 激活 H4 只在服务端提交后显示；等待期间 PAC 保持目标正在选择花色和手牌位置，不暴露未提交选择。服务端 settlement proof 现在绑定最终猜测、唯一真实 reveal/physicalCardId、HAND→HAND、结果及实际伤害/防止伤害事件。
- 结算 H4 报告猜测花色、真实牌、匹配结果及实际效果。删去冗余来源手牌短语以适配紧凑一至两行；H4 优先位于原牌面上方，并保护各上排座位首张真实停放缩略牌。
- 修复 Confirm 被中央牌池窄屏规则覆盖的问题；实测宽度落在 80–110px、触控高度至少 44px。

### 当前验证记录

记录时间 **2026-11-06 02:34 UTC**；工具未提供各命令的独立开始时间，故不补造时间点。

- 390×844 单一浏览器场景：Confirm 曾实测 47px，已修正专属选择器优先级；最终中央 reveal 帧实测断言通过，CardFace 为 108×156px、水平居中，H4 与牌面间距在 0–32px，单场景 1/1 通过（7.9s）。此前发现过 4.6px 重叠，根因是 H4 多写了来源手牌文字、增加了高度；缩短为批准示例语义后复测通过。该单场景累计远低于 5 分钟。
- 聚焦 PresentationV2/public-activity API 测试：64/64 通过，用时 8.32s；覆盖匹配/不匹配结算、公开投影一致性及私密选择边界。
- `npm run build` 和 `git diff --check` 通过。构建仅报告已有的大 bundle、Node `module.register()` 弃用和 Vite 动态路由分类警告。
- 提交前检查：最新相关成功 Actions 为 `42137720792`，SHA `90273b87e1753168c69416d1f03b1312582e21bc`。当前 `42c89d9e` 是之后的 Markdown-only 设计/交接更新（部署 workflow 对 `*.md` 使用 `paths-ignore`，该 SHA 没有单独 run）；本任务修改均尚未 push，因此本任务 exact-SHA CI、Worker 部署及生产 smoke 仍待验证。

### 下一步 / 复审边界

只提交本任务文件到 `ux-v2`，等待 exact-SHA 所有必需 Actions、Cloudflare Worker 部署和生产 `/api/health` smoke 结果；在 Handover 补记真实 SHA/run/version。交付状态为 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**，不得自验收。之后停在 Owner iPhone 复审边界。
