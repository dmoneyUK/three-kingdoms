# HANDOVER — 当前唯一下一任务

## §10.49 CAO-CAO-ENTOURAGE-SIMULTANEOUS-WEI-DODGE-01

状态：DESIGN RE-READ COMPLETE — 已完成新版要求与保留代码核对；新版功能尚未实现、未验收。
最新设计：已完整重读远端 8802644e 中的 §10.49.1–10.49.5（规则版本 89658998，ONE WINNER PER ROUND），包括模型、协议、三种领域接入、公开/私有投影、验证与停止条件；不能继续旧的多 Peach 队列方案。§§10.51–53 原有设计要求已经复核，技术交付完成，进入各自待手机审核；详情已移到设计 Table B 与 roadmap，HANDOVER 不保留其执行历史。

最近交付结果：最终源码 29c6b391dc2c2840bfd38bce7cd432cfbfca9373 已 push ux-v2；[Actions 43662122233](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43662122233) 全 SUCCESS（lint/fast、API、browser startup、D1 migration、Worker deploy、production smoke）。2026-11-15 01:20 UTC 直接 health 返回 available；Worker 71a6efb5-935b-4e81-9ba0-8ae1aac833c0。用户真实 iPhone 验收仍待完成。

当前任务保存点：早先 §10.49 未提交代码仍保存在 `/Users/jingedai/.codex/worktrees/ux2-10-49-harvest-20261114`，本轮没有重置、覆盖或混入该工作。交付工作树 `/Users/jingedai/.codex/worktrees/ux2-1051-1053-20261115` 已完成当前用户要求的 51→52→53，无额外实现进行中。

下一恢复点：先检查并保存原工作树全部 dirty 改动，安全对齐最新 ux-v2 与 ONE-WINNER 方案，逐项核对原部分实现可复用范围。只实施一个共享响应窗口任务，保持现有 Negation、隐私/合法动作和完整单次回复结算；每窗口只接受一张真实牌，Dying 只有完整恢复/触发之后仍濒死才新开窗口。不得猜测规则或从旧多贡献设计继续。

验证与交付：聚焦测试；本地 UI/browser 总预算五分钟。记录当前任务每个主要步骤的 UTC 时间、成功/失败、重试原因和实际 push/CI/部署状态。正常精确 SHA CI/部署必需；不得宣称用户验收。

2026-11-15 本轮复习结果：
- 范围已从旧的护驾专用窗口扩展为 ONE SharedResponseWindowPending + ONE shared_response_window_submissions 表；涵盖护驾、激将两个入口、濒死桃救援，并以 adapter 保持现有 Negation 不变。
- 保留代码中的私有提交解析、幂等存储、全员显式完成/租约和 Attack-Dodge 结算提取可复用；旧 entourage_window 类型/专用迁移尚未上线，不能把它们当最终设计继续接入。原工作树没有被修改。
- 本轮只重读与核对，没有新增游戏逻辑、运行测试或部署。新实现必须完整走既有响应/单桃领域结算；多桃队列、失败意图消耗/退款、跨轮复用都禁止。
