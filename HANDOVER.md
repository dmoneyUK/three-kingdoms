# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**状态：NOT CLOSED / PENDING OWNER iPHONE REVIEW。** 设计依据为 `docs/UX2-refine.md` §10.59，revision `2026-11-16 09:42 UTC`。用户要求把本任务剩余实现与回归合并为一个最终实现提交；不拆分独立任务，也不开始后续任务。

## 已部署基线

- 基线 `684bc5ef6794fa6d87be14860e4e8cdeb56b5864` 的精确 SHA [GitHub Actions 43925523746](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43925523746) 全部通过；Worker Version `eebc691b-c535-43f4-872f-c296478d1049`，生产首页与 `/api/health` smoke 通过。
- 该基线的 React DOM 检查已证明普通摸牌结果在观察者页面有且只有一个可见 H4；本次合并修订扩展为 actor 与全部观察者，并增加真实 Axe of Insanity 非伤害失血场景。

## 当前交付与 CI 纠正

- 实现提交 `1d0e6f9c5b0059d72129a34d2b13a2dbb7e0021e` 已推送。为真实 H4 DOM 增加事件 ID、权威 public sequence 和唯一 owner 标记；浏览器回归检查实际 React DOM 中该事件恰有一个可见 H4。
- 增加四名玩家视角摸牌回归及 Axe of Insanity 实际失血场景；补充效果失血与伤害/HP 费用的区分、Judgement→Hand 实际获得数量和可证明的根事件身份，同时保留私密手牌到达记录。
- 精确 SHA Actions [43934483261](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43934483261)：lint/fast 与 API 通过；浏览器任务失败，原因是测试先挂载出牌者页面，初始化推进摸牌阶段，导致后续 `draw` 合法动作断言过时。当前跟进差异已将服务端摸牌提交移到页面挂载之前；这是测试顺序修正，不改游戏行为。失败后 deploy job 被跳过。
- 按用户指示未运行本地测试、build、UI 或设备测试；跟进差异 `git diff --check` 通过。此修正仍须随 §10.59 一起通过新的精确 SHA CI、Worker deployment 和生产 smoke。

## 唯一继续任务与边界

继续同一个 §10.59：确认实际 React DOM 系统级断言通过，并完成已批准的服务端来源覆盖、共享保留/唯一 H4 owner 回归。不能仅凭 projection owner helper 宣告页面可见；不公开隐藏牌身份、不推断未提交结果、不改变规则。不得标记 USER-ACCEPTED；Owner 仍需统一进行 iPhone 最终验收。
