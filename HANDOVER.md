# HANDOVER — 当前执行交接

## 当前唯一任务：PUBLIC-DISCARD-UX-01 / M4 E15 (§10.36)

**状态：首个实现 SHA 已推送但 fast CI 失败；CI 修复已在本地完成并通过三条定向回归，替换 SHA 尚待提交/推送/CI。未部署、未验收。** 最新设计为 `docs/UX2-refine.md` Revision 2026-11-04 20:17 UTC；`ux-v2` 首个实现 SHA `07d03967f838aff40baf50e9746a26985ff82ab9`。

### 已确认原因与实现范围

- 服务端弃牌事件已带真实牌 ID、HAND→DISCARD 证明和较新 `publicSequence`；旧 H4 未让弃牌事实取得公告所有权。
- 下一普通回合 PAC 被上一判定的停靠卡布局挂起；当前普通回合状态不再等待已过期的共享阶段布局。
- 观察者 Console 不得显示上阶段选择或旧判定原因；交互决策仍优先使用已验证的 `PresentationClientView`，仅当服务端回合座位已经推进时才让当前 `turn` 状态取代旧互动。
- H4 仅从新提交的公共弃牌事实显示公开玩家名与数量。既有弃牌、Dismantle、Steal 物理牌结果所有者和隐私规则不变。

### 验证和失败记录（UTC）

- 首次实现推送：`07d03967f838aff40baf50e9746a26985ff82ab9`；Actions [41904219119](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41904219119) **失败**。API tests、browser startup/room smoke、lint、build 通过；`test:fast` 369/372，失败为 `active decision status ignores legacy ownership and reason fields`、`shared decision presentation keeps turn ownership, action ownership, privacy, and revisions distinct`、`normalized malformed and unknown response states render safely`。Deploy 跳过，没有 Worker 发布。
- 失败后仅运行三条针对性复现；调整为仅在服务端当前座位确实超越旧互动时更新 Console，并对可空 `currentAction` 安全读取。三条定向回归 3/3 通过（20:16 UTC）。
- 当前手机浏览器回归 390×844 为 1/1 通过（20:06 UTC）；本任务本地 UI 总时长未超过 5 分钟。无需再次启动浏览器测试。
- 弃牌路由/布局测试 7/7、E15 定向 API 18/18 通过；变更文件 ESLint 0 errors、15 warnings；`git diff --check` 通过。首个 SHA 的 CI build 也通过。

### 唯一恢复点

只提交当前 CI 修复（`app/page.tsx` 和本 handover/设计状态），推送 `ux-v2` 并等待替换 SHA 全部 Actions 与 Worker smoke。部署前不得宣称 E15 技术交付完成；部署后更新精确 SHA、CI、Worker 结果。最终状态应为 `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`，不得自行验收或启动其他任务。
