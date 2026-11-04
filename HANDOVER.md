# HANDOVER — 当前唯一任务

## T6 §10.30 + §10.22：PAC/Console 接缝与共享紧凑选牌池

**状态：IN PROGRESS — NOT ACCEPTED。** 本轮只执行 T6 的两个开放修正；完成代码和部署后等待一次合并的用户 iPhone 复验，不得自行标记通过。

**设计复核：** `docs/UX2-refine.md`，远端 `ux-v2` SHA `3d23b9807d5c6af6869eabe2133a8108af45f29d`，§10.22、§10.30；执行流程 `docs/AUTONOMOUS_UI_LAYOUT_AGENT_WORKFLOW.md`。工作树在该 SHA 与 `origin/ux-v2` 一致且原本干净。T6 已接受的甘宁 H4/真实 CardFace/PAC 显示时序作为回归合同。

**当前子步骤：PAC / Console 接缝 — 本地实现完成，精确 SHA CI 与部署待执行。** 2026-11-04 00:13 UTC 定位到 `sharedPublicStageMatchesElement()` 要求 PAC/H4 先位于新目标位置，才允许消费者把两者移过去，形成循环等待；已拆分代际归属检查与 `canRetainPublicStageLayout()` 的旧几何安全检查。共享 REVEAL/MOVE/PARKED 和独立 PAC 回退现以实际 `.console-guidance` 顶边为下锚。

**本地结果：** `npm run build` 通过；定向 ESLint 通过；`tests/public-stage-layout.test.mjs` 与 `tests/public-card-announcement.test.mjs` 共 38/38 通过；手机 390×844 的既有 Something Out of Nothing / Barbarian Invasion 真实浏览器场景通过。测量到 H4→卡牌间距 8px，卡牌→PAC 间距 9px；PAC 底边分别与 Console 顶边精确重合（0px），REVEAL/MOVE/PARKED 的共享身份一致。浏览器场景约 15 秒；累计 UI 测试仍低于每步 5 分钟。CI、Worker 部署与线上健康检查尚未运行。

**同一任务后续范围：** §10.22 的顺手牵羊、过河拆桥/燃烧桥及同组件 actor target 选择使用同一紧凑布局；不改两种牌的服务器效果。保留有效区签名与数量、44px 触控牌背、信息按钮、键盘/触控可达性、可读且至少 44px 高的 Confirm/Use。仅在有选中提示时保留对应提示行；旁观只读标题不变。

**交付与恢复点：** 当前源码 + 本 HANDOVER 等待提交推送 `ux-v2`；推送后记录本次精确 SHA、Actions、Worker 版本与 `/api/health`。仅当本次 CI/部署成功，才开始 §10.22；该子步骤完成并部署后等待一次合并的用户 iPhone 复验。最终状态为 `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`。
