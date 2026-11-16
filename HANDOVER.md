# HANDOVER — 唯一当前任务：§10.59 Step 2G 普通摸牌结果发布

**状态：Step 2F 已部署；当前执行 Step 2G。** 最新设计 revision：`2026-11-16 01:34 UTC`。Owner 负责真实游戏/手机验收；按 Owner 指示，Agent 不运行本地实际测试、构建或设备测试。远端精确 SHA CI、部署和生产 smoke 仍按项目交付要求执行。

## 最近交付

§10.59 Step 2F 在共享 `advanceHpRecoveredEvents` 发布服务端已提交的实际 HP 恢复结果（按目标合并、正整数实际恢复量、保留 continuation 幂等性）。实现 SHA `2935944ef5ae6d8ddd04bd8415b05d07b856eb38`；[精确 SHA Actions 43805162032](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43805162032) 全部成功，D1 migration、Worker deploy 和生产 smoke 均通过；Worker `86ad7de5-d9d2-41ca-ac64-dc23e9df6ab3`，生产 `/api/health` 返回 `{"ok":true,"worker":"available"}`。未运行本地测试/构建/浏览器/设备测试。

范围限制：若恢复续接带有 causal context，但日志不能唯一证明对应公开根事件，则实现 fail closed，不猜 `rootEventId`。§10.59 全局覆盖仍未完成、未验收。

## 当前任务边界

§10.59 Step 2G：把普通摸牌阶段 `resolveNormalDrawPhase` 的**实际已提交摸牌数**接入同一个通用公共结果发布器。仅使用服务端 draw commit 的真实结果数，不使用请求数量、历史文案或客户端手牌差值；保持抽到的卡牌身份私密、既有规则/时序/权限不变，并确保在提交成功后只发布一次。只做此源边界，不顺带接入其他摸牌或技能路径。

按 Owner 指示跳过本地实际测试；完成后检查 diff 并提交推送，再核实精确 SHA GitHub Actions、部署和生产 smoke。不得标记 §10.59 USER-ACCEPTED；下一安全边界再复习最新设计选择后续单一源边界。
