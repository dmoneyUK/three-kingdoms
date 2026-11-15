# HANDOVER — 当前唯一任务

## §10.51 ROOM-POLL-TRANSIENT-503-RECOVERY-01 — P0 correction

状态：READY TO IMPLEMENT / NOT ACCEPTED。已在安全交付边界复习最新远端设计 `3d15e9dc` 的§10.51（含09:02交付标记）；工作树 `/Users/jingedai/.codex/worktrees/ux2-shared-response-20261115`，分支推送目标 `ux-v2`。

最新相关结果：§10.49最终实现 `5b8e06ec1d73d6b608db66bf7545b690c8e7fc4f`，[Actions43696816383](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43696816383)全SUCCESS，D1迁移0013成功，Worker `119751bd-4da3-415b-bdb0-2d743d6d35a8`；09:02 UTC直接生产首页200、healthavailable。仅技术交付，待owner iPhone审核。完整本任务之外历史已移至roadmap，不在本文件保留。

本任务范围：错误边界增加脱敏高优先级render-failure诊断；Retry保留会话并一次GET重取权威状态、绝不重播POST；只有明确Leave/确认无效会话可以清理；生命周期trace保留导出；仅timer-only start_response_timer的stale409执行一次GET重同步，其他mutation错误保持现合同。

恢复点（2026-11-15 09:03 UTC）：先提交§10.49真实交付文档，然后检查现有GameRoomErrorBoundary、poll recovery、trace模块和最近针对性用例，按§10.51批准步骤实施。未开始本任务源码修改/测试，不猜测Barbarian或退出根因。源端明确缺失证据则报告EXIT ROOT CAUSE NOT PROVEN FROM CAPTURE。

验证/边界：优先纯组件/会话重试/计时409测试，保留503和404既有回归；至多一个真实手机smoke、本地UI累计≤5分钟。必须实际source diff、exact-SHA CI/Worker/smoke，不自标USER-ACCEPTED。每个主要修改/测试/失败修正/push记真实UTC和结果。
