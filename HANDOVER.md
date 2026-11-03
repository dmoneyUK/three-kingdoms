# HANDOVER — 当前唯一任务

## 对手判定标志的手机间距修正

**状态：IMPLEMENTED / focused validation PASS / exact-SHA CI and deployment pending.**

**设计复核：**最新版 `docs/UX2-refine.md`（`b2ab078b186e06262fff663403ee21583e832e0d`）§10.31 已将 T1 核心设计标记为用户通过：座位状态栏保持 **HP → 判定标志 → 装备槽**，只显示真实公开的闪电/乐不思蜀标志。用户 2026-11-03 新截图要求图标与 HP、装备标志更清楚分开；这是当前唯一执行任务，不改变已接受的身份、顺序、卡位、公开性或 gameplay 语义。

- 2026-11-03 22:55 UTC：源码显示有判定标志时整行 `gap: 1px`。仅对手机端且状态容器宽度至少 108px 的座位，给判定标志两侧增加 3px margin；窄座位（包括 6 人局）继续紧凑，由现有几何保证不重叠。
- 2026-11-03 22:55 UTC：`npm run build` 通过。已重建 `dist/client` 后运行 `npx playwright test --config tests/browser/playwright.config.mjs tests/browser/judgement-seat-rail-real-gameplay.spec.mjs --grep "T1:" --workers=1`，2/2 通过：390×844 双视角确认 HP/图标及图标/装备槽间距各至少 4px，且四个装备槽保留；390×700 六人窄座位确认判定摘要、HP、装备槽不重叠。累计浏览器测试未超过 5 分钟；未做 desktop 验收。
- 诊断记录：重建客户端前的浏览器结果使用旧 `dist/client`，不作为证据；重建后曾发现整行统一加宽会令六人座位装备区溢出 0.125px，现已改成仅宽座位增加图标 margin，并由最终 2/2 回归覆盖。
- **唯一后续步骤：**提交并推送本项变更，核实 exact-SHA GitHub Actions 和 Worker 部署；部署后等待用户 iPhone 复验这项间距修正。不得把 T1 已接受的核心行为重新标为未接受，也不得将本次手机反馈标为已验收。
