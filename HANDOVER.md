# HANDOVER — 唯一当前任务：§10.59 Step 2F 实际 HP 恢复结果

**状态：已授权，源码边界已复核，待实施。** 最新远端复核：`origin/ux-v2` = `241511b95317e234207d60c73023fb2145d3eada`；设计 revision `2026-11-16 01:34 UTC`。Owner 负责实际游戏/手机验收；按 Owner 指示不运行本地游戏、浏览器、设备测试或构建。

## 最近交付

§10.59 Step 2E 已部署：提交 `4986edf90393482ef527408ecb577b709168f091`，精确 SHA Actions [43801738109](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43801738109) 全绿，Worker `aecf5f1c-cd39-47cf-8173-fb1db1df4053`，D1 无迁移。Agent 未运行本地测试，仅做源码审阅与 `git diff --check`。

§10.60 原生 Hand 滑动修复已包含在该部署版本：75% 最小牌距现存于 `calculateHandCardStep`，滚动 rail 命中区启用 `pointer-events:auto`、上方透明 Dock 区域穿透；最初修复提交 `2232d829` 的快测曾失败，后续当前部署 SHA 的完整 CI 全绿。Agent 未做真实 iPhone 测试，Owner Chrome/WebKit 实机复验仍待进行，未标记验收。

## 当前任务边界

§10.59 Step 2F：沿共享 `advanceHpRecoveredEvents` 提交后边界，用实际已恢复 HP 数值向同一公共 outcome/H4 流程发布 `HP_RECOVERED`；覆盖共享恢复和连续恢复记录，保留因果身份、真实来源/受影响玩家与隐私。禁止按 Hero/卡牌分支、把请求恢复量当成实际结果或改变救援/触发流程。完成后仍由 Owner 实际验收。
