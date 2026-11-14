# HANDOVER — 当前唯一任务

## §10.48 HARVEST-H4-PAC-VISIBILITY-COPY-01

状态：修正进行中；先前部署未通过用户验收，不能标记完成。

设计版本：origin/ux-v2 `b9e541ae`，已 fast-forward 同步。原 §10.49 已合并回本任务。

当前进展：重新阅读最新 G1–G4。已确认源码中 H4 选牌事实 ID 与共享布局要求的实体牌事件 ID 不一致；牌池显示时 anchorEventId=null，provider 的 announcements 过滤因此缺少匹配路径。此为源码确认，真实运行首个失败检查仍未验证。

下一执行点：G1 在精确源码 SHA 的 Worker/D1 场景捕获首个失败检查；再按 G2 加入独立 stagePrimaryEventId 关联、G3 重新发布当前布局、G4 实际执行连续多领取者及 TEST SWITCH 浏览器回归。不得跳过运行证据。

验证约束：本地原任务五分钟 UI 预算已耗尽；使用定向远端 CI 执行真实浏览器场景。原通用 startup smoke 未执行该场景，不能作为通过依据。

上次部署：源码 `532ced390aaba5203458c8945bf9a0d1933bcc8d`，Actions 43618989702 成功，Worker `b43c9f12-e9c5-4ee8-a61b-0993e4432437`；该部署不是新反馈修复的证据。

本轮仅同步最新设计并更新当前任务记录；尚无新的生产代码修复、提交或部署。
