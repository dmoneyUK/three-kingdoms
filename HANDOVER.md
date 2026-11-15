# HANDOVER — 当前唯一任务

## §10.51 ROOM-POLL-TRANSIENT-503-RECOVERY-01 — P0 correction

状态：IMPLEMENTING / NOT ACCEPTED。已在安全交付边界复习最新远端设计 `3d15e9dc` 的§10.51（含09:02交付标记）；工作树 `/Users/jingedai/.codex/worktrees/ux2-shared-response-20261115`，分支推送目标 `ux-v2`。

最新相关结果：§10.49最终实现 `5b8e06ec1d73d6b608db66bf7545b690c8e7fc4f`，[Actions43696816383](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43696816383)全SUCCESS，D1迁移0013成功，Worker `119751bd-4da3-415b-bdb0-2d743d6d35a8`；09:02 UTC直接生产首页200、healthavailable。仅技术交付，待owner iPhone审核。完整本任务之外历史已移至roadmap，不在本文件保留。

本任务范围：错误边界增加脱敏高优先级render-failure诊断；Retry保留会话并一次GET重取权威状态、绝不重播POST；只有明确Leave/确认无效会话可以清理；生命周期trace保留导出；仅timer-only start_response_timer的stale409执行一次GET重同步，其他mutation错误保持现合同。

恢复点（2026-11-15 09:03 UTC）：先提交§10.49真实交付文档，然后检查现有GameRoomErrorBoundary、poll recovery、trace模块和最近针对性用例，按§10.51批准步骤实施。现已开始本任务源码修改与针对性验证，不猜测Barbarian或退出根因。源端明确缺失证据则报告EXIT ROOT CAUSE NOT PROVEN FROM CAPTURE。

验证/边界：优先纯组件/会话重试/计时409测试，保留503和404既有回归；至多一个真实手机smoke、本地UI累计≤5分钟。必须实际source diff、exact-SHA CI/Worker/smoke，不自标USER-ACCEPTED。每个主要修改/测试/失败修正/push记真实UTC和结果。

2026-11-15 09:12 UTC：实现错误边界Retry与明确Leave分离；Retry重取权威GET，不清会话/不重播POST。新增结构化脱敏错误分类/组件名/版本指纹/seat，关键生命周期独立128条保留及trace最终status/actionKind；仅timer-arm stale409一次GET，其他动作错误不忽略。针对性17/17 PASS（含原503/404、真实React错误边界抛错/重复失败/Retry/Leave、trace大量DOM淘汰），build PASS，新模块/trace/测试lint PASS、diff待最终核对。唯一四人440px真实Attack→GROUP_RESOLUTION→受控错误注入/Retry场景正在运行，累计UI预算≤5分钟；不声称复现owner原始未知异常，尚未commit/push/部署。

2026-11-15 09:16 UTC：四人440px手机场景PASS：真实Attack respond200→下一目标Negation→实际错误边界受控注入→Retry仅GET恢复/会话不变/Attack仅一次→重复错误可下载trace→明确Leave才清会话。首次断言误写GROUP_RESOLUTION，实际合法下一阶段NEGATION；仅将断言改为NEGATION并校验真实下一目标，未改游戏规则。两次累计UI18.13s，不再增测。结构化脱敏诊断支持minified组件名和白名单属性名，原始错误消息/路径/私有ID不导出。最终针对性17/17 PASS、模块/trace/测试lint PASS、diff check PASS；即将commit/push，EXIT ROOT CAUSE NOT PROVEN FROM CAPTURE，待owner新trace/phone审核。
