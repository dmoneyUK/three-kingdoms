# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**状态：NOT CLOSED。** 各有界切片属于同一 H4 架构任务；完整来源覆盖、事件留存、唯一显示所有权和系统级回归齐备后，再提交 Owner iPhone 验收。当前设计依据：`docs/UX2-refine.md` §10.59，revision `2026-11-16 09:42 UTC`。

## 最近部署结果

- `bf2ca08f4c3c0779d4e20181c4a10b2d71fb8e1a` 将 Draw Phase Replacement 的实际手牌转移并入共享 committed outcome/H4；记录真实来源玩家、收件玩家和数量，不公开转移牌身份。
- 精确 SHA [GitHub Actions 43923298157](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43923298157) 全部通过：API、lint/build/fast、浏览器启动 smoke、D1 migration、Worker deployment、production smoke。Worker Version ID：`927b7f07-83ea-4417-b7b2-8f06abb2019a`；额外 `/api/health` 返回 `{"ok":true,"worker":"available"}`。
- 按 Owner 指令未运行本地测试、build、设备或浏览器测试。先前恢复断言使用字段错误已更正：正确路径是 `recoveryFact.identity.interactionId`。

## 当前有界步骤

补齐 §10.59 的真实 React DOM 验收。API helper `assertPublicOutcomeHasH4Owner()` 只证明事实到达 projection/formatter/owner selector，不能证明页面真正显示了 H4。新增的真实对局浏览器场景验证：服务端已提交普通摸牌结果后，观察者 React 页面按同一事件 ID 显示一个可见 H4，只有一个可见 H4，文案数量正确且不泄露摸到的牌 ID。已将该场景加入部署 CI 的有界 browser smoke；尚未运行远端 CI。

## 继续范围与验证边界

§10.59 仍需完成剩余服务端结果来源、公开类别筛选/留存与唯一 H4 仲裁，以及 rapid event/reconnect/TEST SWITCH/privacy 等系统回归。实现和回归继续使用同一 publisher、validator、formatter 与 React H4 owner，不拆分新任务编号，不做 Owner 中途验收。本步骤改动包括上述 browser 场景及必需 CI 调用；本地仅允许 `git diff --check`，提交后核验精确 SHA GitHub Actions、Worker deployment 和 production smoke。不得标记 USER-ACCEPTED。
