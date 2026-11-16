# HANDOVER — 当前唯一任务：§10.60 手牌横向滑动 iPhone 修正

## 最新相关结果

- §10.59 Step 1 已推送：`a30d7ad1581ac55066a5c9b8c311b1f0172551d8`；精确 SHA Actions [43783128501](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43783128501) 全绿，Worker `04692abe-e8a6-436e-8d93-631debcdf736` 已部署，生产 `/api/health` HTTP 200。此结果不代表 §10.59 完成。
- §10.60 先前版本 `02cb61288d19478433cccd2310650c4a41f8cebf` 已部署，但 Owner 报告 iPhone 手牌仍无法横滑；此前 Chromium CDP 测试不足以证明 Safari 行为。
- 本次复核设计版本：`docs/UX2-refine.md` Revision 2026-11-16 00:19 UTC，基线 `7f2eb25e19b5932a17b3aee9b21c40f6d441b3a0`。

## 当前执行

仅执行 `docs/UX2-refine.md` §10.60 `LOCAL-HAND-OVERLAP-TOUCH-SWIPE-01`。保持 68px 手牌面、相邻卡至少 75% 面宽推进、原生横向溢出、首末牌可达、滑动不误触，且刻意点按仍可选择/检查目标牌；保留抬升、响应/弃牌、滚动恢复和 TEST SWITCH，不改游戏权限或牌身份。

根因修正依据：牌池滚动规则同时应用于滚动容器和实际触摸按钮；手牌容器已有 `pan-x`，但实际普通手牌按钮、信息按钮和反选按钮没有。已将 `touch-action: pan-x` 加到这些手牌触摸目标；保留 `.local-hand-rail` 的 `pointer-events:none`，避免盖住上方技能/装备按钮。一个 440px、11 张手牌的 Chromium 移动触摸场景通过：横划到末张、不误选、点按末张只选择该牌，技能按钮仍命中。定向 ESLint 与 `git diff --check` 通过。此结果不是 iPhone Safari 验收。

## 验收与交付

本次 UI/browser 累计仅运行该单场景，未做设备矩阵。源修正尚未 commit/push；提交前检查到 `ux-v2` 最新相关 Actions 为 SHA `a30d7ad1581ac55066a5c9b8c311b1f0172551d8` 的 [43783128501](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43783128501)，全绿。下一步提交并推送到 `ux-v2`，核实新 SHA 的 CI、Worker 部署及生产 smoke。部署后状态为 IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW。

精确续点：完成上述交付；若 Owner 的真实 iPhone 横滑仍失败，不再重复 Chromium 触摸循环，按 §10.60 记录 Safari 的实际命中目标与是否发生滚动后再改。
