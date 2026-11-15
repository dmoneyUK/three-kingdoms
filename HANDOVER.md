# HANDOVER — 当前唯一任务

## §10.56 OPPONENT-INSPECTOR-SEAT-ANCHOR-01

**状态：** 当前任务；尚未实现；需要用户手机复验。

**最新设计：** `docs/UX2-refine.md` revision `2026-11-15 20:02 UTC`。本任务只按 §10.56 执行，支持 4–6 人局。手机顶排 Inspector 应根据实际选中玩家座位的实时 DOMRect，尽可能紧贴其下方；保留侧边座位现有行为、隐私、详情内容和操作。

**§10.49 / §10.51 复审结果：** 两项源码复审已完成，但 owner 报告的失败仍为 OPEN / NOT ACCEPTED。§10.49 的修复已在生产代码中；过期恢复单测 4/4、共享响应 API 14/14 通过。§10.51 的 GET 恢复与 React 拥有 H4 节点的约束已落实；room-poll 恢复单测 4/4、错误画面恢复单测 3/3 通过。现有 §10.49 视频属于修复前 SHA；两项均未提供修复后的失败 trace。不得推断新原因或自行标记验收；仅在拿到当前失败步骤的证据后回到对应原任务。

**§10.58 最近交付：** commit `4164b5eba9ec3501cdf95f0cdad1e8eb1f9c6ace`；[精确 SHA Actions 43754584146](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43754584146) 全部必需 job 通过；Worker `2f2ea283-d616-4201-a800-792d606924fe`；生产 `/` 和 `/api/health` smoke 通过。状态：IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW。

**本任务步骤：** 检查 `OpponentPublicInspector` 的测量代码和已有手机几何测试。新增或调整一个聚焦的 4–6 人顶排行为分支：使用当前选中真实座位的 DOMRect、viewport 安全边界和现有遮挡物进行锚定；保持侧边座位分支不变。必要时仅运行 440px 左/中/右座位场景，单任务本地 UI/浏览器测试总计不超过 5 分钟。完成聚焦验证和 `git diff --check` 后，提交推送并核实精确 SHA Actions、Worker 部署及生产健康检查。不得声称用户手机验收通过。
