# HANDOVER — 当前唯一任务：§10.60 Hand 原生横向滑动修复

**状态：修复已推送，精确 SHA CI 首轮失败、修正后待 CI；未验收。** 当前设计版本：`docs/UX2-refine.md` revision `2026-11-16 01:34 UTC`。Owner 已确认旧部署在英国 iPhone Chrome（iOS WebKit）仍无法滑动，旧 Chromium/CDP 通过不构成手机验收。

## 本次实现

- `app/sequence-overrides.css`：原生滚动容器 `.local-hand-rail` 自身改为可命中（`pointer-events:auto`）；透明 Dock 上方面板区域透传触摸，技能和装备的实际按钮提升为独立命中目标，避免滚动区域截断其点击。
- `tests/browser/local-dock-hero-hierarchy.spec.mjs`：保留 440px、11 张手牌原生触摸滚动与末张选择回归，并断言技能及装备按钮命中和装备详情点击。
- `tests/room-safety-render.test.mjs`：替换与新命中策略冲突的旧 `pointer-events:none` 静态断言，改为检查 scrollport 可命中、透明面板透传、技能/装备真实按钮位于上层。
- 未修改游戏规则、服务端权限、卡牌身份、卡牌尺寸或既有 75% 卡面步长。

## 验证与边界

- `npm run build`：PASS。
- §10.60 定向 Playwright Chromium/CDP 触摸场景：1/1 PASS（11 张牌滑至末张、滑动不误选、点选末张、技能/装备按钮可命中及装备详情可打开）。此结果不是 iPhone WebKit 实机证明。
- 定向 ESLint 与 `git diff --check`：PASS。
- 首次推送 `2232d82970703e79e29a67e7d2ac4c638117ca32` 的 Actions [43788961249](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43788961249)：浏览器 startup smoke 与 API tests PASS；`test:fast` 1 项失败，因 `tests/room-safety-render.test.mjs` 仍断言滚动条 `pointer-events:none`。已按新契约更新该静态断言；待新提交精确 SHA CI 复验。部署因门槛失败未运行。
- 当前环境只有 Chromium Playwright 浏览器；`xcodebuild`/`simctl` 不可用，未能执行真实 iPhone Chrome 或 iOS WebKit A/B。不得据此宣称手机问题已证实修复；新版部署后需确认真实滑动及点击路径。

## 唯一当前任务

§10.60 原任务：完成 CI 修正并部署；Owner 随后用 iPhone Chrome 验证 11 张手牌真实单指滑动、末张完整可达、滑动不触发选择，以及技能/装备按钮仍可点击。状态保持 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**，直到 Owner 明确验收；不得标记 USER-ACCEPTED。
