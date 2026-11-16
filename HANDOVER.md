# HANDOVER — 唯一当前任务：§10.60 Hand 原生横向滑动修复

**状态：已按 Owner 指示授权，待实施。** 最新远端设计复核：`origin/ux-v2` = `4986edf90393482ef527408ecb577b709168f091`，§10.60 标记为 iPhone Chrome/WebKit 验收失败。Owner 将自行进行实际手机测试；Agent 不运行本地游戏、浏览器、设备测试或构建。

## 最近交付

§10.59 Step 2E 已实现并部署：提交 `4986edf90393482ef527408ecb577b709168f091`。精确 SHA Actions [43801738109](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43801738109) 成功：API tests、lint/fast、单场启动 smoke、D1（无迁移）、Worker deploy 和 production smoke 全绿。Worker 版本 `aecf5f1c-cd39-47cf-8173-fb1db1df4053`。未运行本地测试/构建/浏览器/设备测试；`git diff --check` 通过。§10.59 仍开放，待后续来源边界实现和 Owner iPhone review。

## 当前任务边界

§10.60 按设计修复两项：手牌相邻牌的前进距离至少为牌宽 75%（68px 牌宽时至少 51px，最多遮挡 25%）；实际滚动容器在拥挤时保留原牌尺寸并启用原生横向溢出，修复该滚动命中区的 pointer-events/阻断层，使 iPhone Chrome/WebKit 单指滑动可工作。只做设计指定的局部修改，不做 JS 假轮播、不改规则/H4/全局 Dock。提交后由 Owner 实机验收；不得标记 USER-ACCEPTED。
