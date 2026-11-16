# HANDOVER — 当前唯一任务：§10.62 H4 认证玩家姓名片段修正

## 最近交付结果

§10.61 Boundary B 已实现并部署，仍待 Owner iPhone 复验。实现 commit `84416e4db4381bc7a673832910bc633a8e41a4ce`；CI 断言修复 commit `2c745589c55efacdfad855008d169d5dba4ede7e` 的 Actions [43980227100](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43980227100) attempt 2 全绿。D1 migration、Worker 部署和生产 smoke 均通过，Worker `ebdd299b-11f7-49f3-a275-10c11cf35535`；生产首页与 `/api/health` 返回 200。第一次 attempt 的 API shard 出现连续 `fetch failed`，同 SHA 完整重跑通过。未运行本地测试、构建或设备测试。

## 当前任务：§10.62 H4-VERIFIED-PLAYER-FRAGMENTS-REGRESSION-01

依据 `docs/UX2-refine.md` revision `2026-11-16 21:51 UTC`，设计 commit `c82c15d901f2340e57594dd08408ca638ed10fff`。Owner iPhone 反馈仍有两类 H4 使用大号姓名：Negation 窗口里的 Burning Bridges 根事件，以及带真实嵌入弃牌牌面的 Dismantle 结算。保留已通过的普通事件姓名样式、完整正文、真实花色/点数/牌名、事件身份和唯一 H4 owner。

按设计仅修复现有共享 typed-copy 路径：给 Negation 文案附带由已证明 playerId 生成且与最终 headline 匹配的片段；给 Dismantle 的牌面前后文本保留已验证的 actor/target 片段，同时保留真实嵌入牌面。公告初始、更新、保留测量副本时，均按最终展示文案校验 narration 与候选 segments，防止生命周期切换丢失片段或误用旧文案。缺少或不匹配的身份依据时保留原始纯文本。禁止解析姓名字符串、添加专用横幅、改变规则/隐私/牌面尺寸/位置/PAC/Console，或降低整段 H4 字号。

**当前实现进展：** `PublicCardAnnouncement` 现在只保留与最终可见 headline 完全匹配的已验证 fragments；Dismantle 的真实牌面及 actor/target spans 共用一个生产 H4 内容组件。新增快速回归断言覆盖 Negation 窗口里的 Burning Bridges 根公告及完整 Dismantle 复合公告。未运行本地测试、构建或浏览器测试；远端精确 SHA CI 尚待提交后验证。手机验收仍由 Owner 完成。

Owner 要求不做本地实际测试；只执行 `git diff --check`，提交并推送后核验精确 SHA 的必需 CI、Worker 部署和生产 smoke。不得自行标记 USER-ACCEPTED。
