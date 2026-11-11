# HANDOVER — 当前唯一任务

## CARD-FACE-TYPOGRAPHY-UX-01 / §10.39 — 手牌类别单行适配

**状态：本地修正完成，focused 手机回归通过；精确 SHA CI/部署待提交。** 已部署字号基线 `22a425d01dc48870da3507253151f885983e9e4e`；精确 SHA Actions [42926203575](https://github.com/dmoneyUK/three-kingdoms/actions/runs/42926203575) 全绿，Worker version `9de9ee02-85d6-4990-b256-5f3f9ed8bb74`。当前分支 `codex/ux2-judgement-seat-01`，远端 `ux-v2` 文档头 `a8704453ead6ed33f4ece1fac2d8f9fa9cde43a1`。最新设计已于 2026-11-11 19:57 UTC 复习。

### 目标与边界

- 对 68×102px 手机手牌，保留约 10–11px 卡名与约 6px 类别文字；完整类别名须单行容纳，不溢出，卡牌尺寸不变。
- 保持名称两行限制、花色/点数、Details、选择可见性、触控与横向滚动。
- 仅修改本地 Hand 类别文字间距；公共/中型卡面、缩略牌、卡图、游戏规则和隐私保持不变。
- Owner iPhone 验收仍必需；CI/部署不能代替验收。

### 本轮操作和验证（UTC）

- **2026-11-11 19:56 UTC**：核对最新 §10.39 与已部署 `22a425d`。运行现有 `tests/browser/card-face-typography.spec.mjs`，手机 390×844 场景失败：字号调大后 `STRATAGEM CARD` 的 `scrollWidth` 超出可用宽度。
- **2026-11-11 19:57 UTC**：按 §10.39 “先收紧字距，不扩大卡牌”将本地 Hand 类别字距改为 `normal`；同一手机浏览器场景通过 1/1（5.5s）。没有运行多设备/多玩家矩阵。当前未新增测试。

### 唯一后续

检查本次最小 diff 与 `git diff --check`，提交并推送到 `ux-v2`；等待该实现 SHA 的必需 Actions、Worker 部署及 production smoke。随后保持 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**，等待 Owner 复审，不自行标记 USER-ACCEPTED。
