# HANDOVER — 当前唯一任务

## T6 / PUBLIC-PAC-REVEAL-ORDER-01 — §10.30 + §10.22 手机复验

**状态：IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW。** 不得把 CI、部署或 Agent 的手机模拟测试记作用户验收。

**设计复核：** 最新 `origin/ux-v2` 设计修订 `3d23b9807d5c6af6869eabe2133a8108af45f29d`，`docs/UX2-refine.md` §10.30 与 §10.22；实施流程 `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`。UX 规则未改；Table A 与本 HANDOVER 已更新为待用户复验。

**§10.30 PAC/Console 接缝：** 实现 SHA `b3bacf00344d3a3be29f27adb2be677ae4d2cbf9`；[Actions 41745298490](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41745298490) 全部通过；Worker Version ID `0da1dba4-9204-44b6-a46c-ce46dd0b9e3c`；生产 `/api/health` HTTP 200。定向手机场景验证 H4→完整卡面保留 8px、卡面→PAC 9px、PAC→Console 0px。

**§10.22 共享紧凑选牌池：** 顺手牵羊与过河拆桥/燃烧桥使用同一 `CardPoolPanel` actor 布局；多有效区时 tabs 是唯一可见区名/数量并保留 ARIA 语义，单区及旁观只读标题保留；压缩面板空隙、空提示行高度为 0、缩小 Confirm/Use 且不截断文字并保持≥44px 高。匿名牌背、公共卡信息、混合区域、键盘/触控与服务器授权提交不变；Steal 仍获取牌，Dismantle 仍弃置牌。实现 SHA `eb9daa62ee25aecd80f4200df82530f4dc46de95`；[Actions 41748282260](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41748282260) 的 Lint/fast、API、browser smoke、deploy 全部通过；Worker Version ID `2b1e4376-6ce7-43a2-815a-b8d9b6a3ae97`；生产 smoke 通过，手动 `/api/health` HTTP 200。

**验证记录（2026-11-04 UTC）：** 定向组件测试 47/47；`npm run build`、定向 ESLint、`git diff --check` 通过。一个真实 390×844 Steal Hand(4) 浏览器场景 1/1 通过（9.1 秒）：4 个匿名选项、无重复区标题、空提示 0px、紧凑且完整可读的 `Use Steal`、选牌后合法提交并退出选择。首次尝试使用本机缺失的 `timeout` 命令，未启动测试；随后直接运行同一场景并通过。总本地 UI 测试少于 5 分钟。

**唯一待办：** 等待用户对 T6 的合并 iPhone 复验；仅按反馈更新本任务，不自行标记 USER-ACCEPTED。
