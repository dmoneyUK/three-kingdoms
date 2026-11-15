# HANDOVER — 当前唯一任务

## 黄盖 Self Sacrifice 公共信息区/H4 与共享技能事件发布修复

**状态：IMPLEMENTED LOCALLY — 等待精确 SHA 的 CI、Worker 部署与生产 smoke。**

**设计依据：** 最新远端 `ux-v2`，`docs/UX2-refine.md` 修订于 2026-11-15 21:34 UTC；执行范围来自当前用户批准指令，遵守 §5.3 R6-QA-02 / R7 的单一事实型 H4 与公开/私有信息边界。实现基于 `69ff09d996a3dc461b1efe2a46d123c90bec3679`，并保留远端文档更新 `580a5e7236e716f16d6cc73c25b504226a684c3c`。

**实现：** 在通用服务端技能结果发布路径记录一条已提交的 `SKILL_USED` 公共事实，并持久化对应因果信封；现有共享 H4/PAC 投影据此生成文案。明确空 `affectedPlayerIds`，使当前交互投影也接纳无目标技能事实。公开事实不包含私下摸牌；未改规则、合法动作或 UI 专属分支。

**修改文件：** `app/api/rooms/route.ts`、`tests/api/huang-gai.test.mjs`。

**验证（2026-11-15 21:40 UTC）：** `npm run build` 通过；定向 Huang Gai API 回归 6/6 通过；`git diff --check` 通过。测试覆盖存活与进入 Dying 两条结果、当前活动公共事实/H4、全体观察者事实一致、私下摸牌不进入公共事实，以及既有救援和实体牌守恒行为。开发中曾有一次新增 Dying 断言失败，确认共享事实缺少空目标数组后修正；最终定向回归全绿。未运行本地 UI/browser 测试。

**交付：** 实现已重放到最新远端设计文档之后，当前任务提交即将推送；精确 SHA CI、Worker 部署及生产 smoke 待执行。最近相关 Actions `43761379770` 对代码 SHA `f2af186d682e9594ffa30be8962fd51c673157bf` 全绿。不得标记 USER-ACCEPTED；部署后等待 Owner iPhone 复验。
