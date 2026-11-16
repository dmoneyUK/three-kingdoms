# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**状态：NOT CLOSED / PENDING OWNER iPHONE REVIEW。** 设计依据为 `docs/UX2-refine.md` §10.59，revision `2026-11-16 09:42 UTC`。用户要求把本任务剩余实现与回归合并为一个最终实现提交；不拆分独立任务，也不开始后续任务。

## 已部署基线

- 基线 `684bc5ef6794fa6d87be14860e4e8cdeb56b5864` 的精确 SHA [GitHub Actions 43925523746](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43925523746) 全部通过；Worker Version `eebc691b-c535-43f4-872f-c296478d1049`，生产首页与 `/api/health` smoke 通过。
- 该基线的 React DOM 检查已证明普通摸牌结果在观察者页面有且只有一个可见 H4；本次合并修订扩展为 actor 与全部观察者，并增加真实 Axe of Insanity 非伤害失血场景。

## 本次合并交付（尚未提交）

- 为真实 H4 DOM 增加事件 ID、权威 public sequence 和唯一 owner 标记；浏览器回归断言实际 React DOM 中按该事件恰有一个可见 H4，而不只验证 projection/formatter/selector 返回 owner。
- 扩展摸牌场景至四名玩家视角，验证相同文案、精确事件顺序、可见性、刷新保留及手牌隐私；增加 Axe of Insanity 实际失去 HP 的真实对局 H4 检查。
- 补齐通用结果事实：区分效果失血与伤害/HP 费用；补充 Judgement→Hand 实际获得数量，保留私密手牌到达记录；为 Judgement 触发补足可证明的根事件身份。
- 对应 API 与浏览器断言已写入本提交差异。按用户指示没有运行本地测试、build、UI 或设备测试；最后一次 `git diff --check` 通过。最终精确 SHA 的 GitHub Actions、Worker deployment 和生产 smoke 尚待推送后验证。

## 唯一继续任务与边界

继续同一个 §10.59：在一个最终实现提交中审查并补齐已批准的服务端事实来源、共享保留/唯一 H4 owner 与实际 DOM 系统级断言。不能仅凭 projection owner helper 宣告页面可见；不公开隐藏牌身份、不推断未提交结果、不改变规则。不得标记 USER-ACCEPTED；Owner 仍需统一进行 iPhone 最终验收。
