# HANDOVER — 当前唯一任务

## T6 §10.22 — 共享 Steal / Dismantle 紧凑选牌池

**状态：本地实现与定向验证完成；本次精确 SHA CI/部署待执行 — NOT ACCEPTED。** 目标是顺手牵羊与过河拆桥/燃烧桥复用同一紧凑布局；不改变授权选牌、获取/弃置效果、隐私或此前通过的 §10.22 功能。完成交付后待用户 iPhone 复验，不得自行标记通过。

**设计复核：** 最新远端设计 `docs/UX2-refine.md`（当前 `origin/ux-v2` 以 `b3bacf00344d3a3be29f27adb2be677ae4d2cbf9` 为 HEAD；设计修订 `3d23b9807d5c6af6869eabe2133a8108af45f29d`），§10.22 紧凑度补充及 §10.30。执行流程见 `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`。

**最近完成的相关交付：** T6 §10.30 PAC/Console 接缝修复已由 `b3bacf00344d3a3be29f27adb2be677ae4d2cbf9` 推送并部署。Actions [41745298490](https://github.com/dmoneyUK/three-kingdoms/actions/runs/41745298490) 全部成功；Cloudflare Worker Version ID `0da1dba4-9204-44b6-a46c-ce46dd0b9e3c`；生产 `/api/health` 返回 HTTP 200。仍待合并手机复验。

**当前实施范围：** 共享 `app/card-pool-panel.tsx` 只在多个有效区域时显示 Hand/Equipment/Judgement tabs；有 tabs 时 tabs 是唯一可见区名/数量，仍保留 ARIA 区名和旁观者只读标题。只压缩 actor target picker：减少面板/区域空隙、移除空选区提示行的高度、缩小 Confirm/Use 按钮并允许完整文字换行；选择保留消息仍可读。牌背维持至少 44px 可触区域；保留混合区域、选择状态/数量、公共牌信息、键盘与触控操作。

**本地验证（记录截至 2026-11-04 00:36 UTC）：** `tests/active-skill-interactions.test.mjs` 47/47 通过，覆盖真实 Steal 与 Burning Bridge 共用组件及两种原有提交行为；定向 ESLint、`git diff --check` 与最终 `npm run build` 通过。单个真实 390×844 Steal Hand(4) 浏览器场景通过（1/1，9.1 秒）：无重复区标签、4 个匿名选项、空提示行为高 0px、`Use Steal` 宽度低于既有 150px 下限且高度≥44px、选牌后正常提交授权 Hand 位置并退出选择。首次调用本机没有的 `timeout` 命令，测试未启动；随即直接运行同一场景并通过。总 UI 测试时间低于 5 分钟。

**交付状态：** 最新已部署基线 `b3bacf00344d3a3be29f27adb2be677ae4d2cbf9` 的 Actions 41745298490 全绿，Worker `0da1dba4-9204-44b6-a46c-ce46dd0b9e3c`，线上 `/api/health` HTTP 200。§10.22 实现与本 HANDOVER 已本地提交；尚待推送。推送后核对新 SHA 的全部 CI/部署与线上健康结果，再记录本任务交付 SHA、Actions、Worker 版本。不得宣称用户验收。
