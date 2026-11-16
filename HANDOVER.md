# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**状态：NOT CLOSED / 部分实现已部署，待继续同一任务。** 各有界切片不单独交 Owner 验收；全部服务端来源覆盖、公共事实保留、唯一 H4 owner 与系统级回归完成后，再提交一次最终 iPhone 验收。设计依据：`docs/UX2-refine.md` §10.59，revision `2026-11-16 09:42 UTC`。

## 最新交付

- 本切片把濒死救援的真实桃恢复量（含华佗 First Aid 转桃）并入实际救援 `CARD_PLAYED` 事件，沿用濒死 causal/root；只有 committed outcome 证明有效时，该牌才接管 Recovery H4，避免重复泛化恢复提示。回归断言覆盖桃、First Aid、准确恢复量、唯一 owner、所有玩家公共事实一致和不公开物理牌 ID。
- 实现 SHA：`c7f31768f568526e3f6b3ed8ce0d3dc57e064d3f`；[精确 SHA Actions 43920739898](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43920739898) 全部通过：API、浏览器启动/建房 smoke、lint、build、fast tests、D1 migration、Worker 部署、生产 smoke。Worker Version ID：`18d41f96-217a-4316-8450-fb6d40f56029`；额外 `/api/health` 返回 `{"ok":true,"worker":"available"}`。
- `git diff --check` 通过；按 Owner 指令未运行本地测试、构建或设备测试。本切片尚未用户验收，且不代表 §10.59 完成。
- 恢复测试的旧字段误用已核正：应读取 `recoveryFact.identity.interactionId`；误用顶层 `recoveryFact.interactionId` 是断言错误，不能据此判为实现缺陷。

## 同一 §10.59 已有覆盖

共享 retained-fact/Discard Phase 结果、借刀杀人的装备转移、顺手牵羊/过河拆桥六种来源区组合、普通桃恢复与濒死桃/急救恢复已接入并有远端 CI 证据；普通 Draw Phase 的实际摸牌数已有 committed outcome 和 API 回归。以上都仍只是全局任务的局部覆盖，保留为后续系统回归。

## 唯一续接点

继续 §10.59 服务端来源顺序：补齐 `resolveDrawPhaseReplacement` 中实际手牌转移的公共结果。该路径目前仅留下非展示 history 和收件者私有到牌记录；改为使用同一公共 outcome publisher/formatter，按已提交的真实来源玩家、收件者和数量生成单一 H4，绝不公开转移牌的身份。随后继续设计中其余 HP/card 变更来源、穷尽式筛选/留存、唯一显示 owner 与系统级回归。仅运行精确 SHA 远端 CI/部署/smoke；不得启动本地测试、build 或设备/browser 测试，也不得标记 USER-ACCEPTED。
