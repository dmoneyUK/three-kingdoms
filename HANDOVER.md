# HANDOVER — 当前唯一任务

## §10.51 ROOM-POLL-TRANSIENT-503-RECOVERY-01

状态：IMPLEMENTED LOCALLY，准备提交；未部署、未验收。
设计：已阅读远端 7e28edb3 的 §§10.51–10.53；本任务只实施 §10.51。
2026-11-15：用户明确要求开始 51→52→53。未完成 §10.49 工作保存在原独立工作树 ux2-10-49-harvest-20261114，本工作树不包含其改动。

已确认：fetchRoomRequest 将所有非 2xx GET 合成永久失效，503 会误删本地会话。准备改为严格 HTTP/结构化错误分类、临时中断保留状态及禁用新提交、单一轮询有界退避、旧 epoch/viewer 回复拒绝。
验证计划：聚焦分类/恢复状态测试、基本 build/diff、正常精确 SHA CI/部署。尚未运行测试；本地 UI 总预算五分钟。
下一恢复点：实现客户端恢复模块并接入 Home；不改变玩法、H4/PAC 或 POST 重放行为。503 上游原因未知，尚无关联历史日志证据。

2026-11-15 实现：严格分类 HTTP/结构化错误；临时失败保留会话/最后房间/视角，独立重连条和新 POST 门禁，单一轮询 1/2/4/8s 退避及身份去重，15s 请求超时；旧 epoch/viewer 完成不写状态，显式 Leave 仍独立。
验证：聚焦 unit 14/14 PASS（含 503→200、阻断 POST、旧视角、去重退避）；build PASS，新增模块定向 lint PASS，diff PASS；未启动本地浏览器。现有可用工具没有该 Worker 历史日志入口或关联请求 ID，未查询其他 Site：503 ORIGIN UNKNOWN — LOGS UNAVAILABLE。正常完整 CI/部署待推送后执行。
