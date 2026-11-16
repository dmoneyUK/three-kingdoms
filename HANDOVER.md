# HANDOVER — 当前唯一任务：§10.59 Step 1 共享公共结果契约

## 最近结果

- §10.56 Inspector/H4 已由 Owner 于 2026-11-16 00:19 UTC 验收通过；最新设计提交 `7f2eb25e19b5932a17b3aee9b21c40f6d441b3a0` 标记 USER-ACCEPTED/CLOSED。
- §10.60 Step 3 已于 `02cb61288d19478433cccd2310650c4a41f8cebf` 推送并部署。精确 SHA Actions [43780573479](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43780573479) 全部通过：lint/fast、browser smoke、API、D1 migration、Worker deploy、production smoke。Worker `aca70fcf-d641-444c-96b2-e2cbf38ccc83`；线上 `/` 与 `/api/health` 为 HTTP 200。440×844、11 张牌移动 Chromium 触摸回归通过：多次真实触摸横划可到末张，滑动不误选，末张可完整显示并单独点选。真实 iPhone Safari 仍待 Owner 复核，因此状态为 IMPLEMENTED/DEPLOYED — PENDING OWNER iPHONE REVIEW。

## 当前执行

只执行 `docs/UX2-refine.md` §10.59 原始任务。已复习最新完整设计：远端基线 `7f2eb25e19b5932a17b3aee9b21c40f6d441b3a0`，Revision 2026-11-16 00:19 UTC。任务仍为 PARTIALLY ACCEPTED / CORRECTION REQUIRED / NOT CLOSED；黄盖苦肉仅是已通过的发现案例，不代表普适 H4 覆盖验收。

当前安全切片是设计执行顺序第 1 步“Common contract and safety”：在现有 `publicFactFor` / causal envelope / `@event` / PresentationV2 路径上定义 typed committed public outcome，建立服务端唯一发布 helper、共享校验/所有权契约和纯 H4 结果文案 formatter；保留保存房间旧事件 wire compatibility。聚焦证明：实际提交身份、顺序、因果关系、actor/target 与实际 HP/卡牌变化数量；拒绝伪造、私有、重复和陈旧事实；不得解析英文 history，不改规则/CurrentAction/隐私，不加 Hero/卡牌专用分支，不在共同消费链尚未完成时宣称 10.59 已通过。

Step 1 本地实现已完成：在 `PublicPresentationEventFactDraft` 增加可选结果草稿，由 `publicFactFor` 做唯一服务端发布入口；共享收集器把草稿绑定到持久 `eventId`、`publicSequence`、causal identity/root/frame、actor/targets，并在 active 与 retained 投影复用同一校验；纯 formatter 只按验证后的玩家名和实际数量生成文案。结果类型不含物理卡牌 ID/牌面，旧日志没有该可选字段时保持原样。没有接入任何结算源，也没有接入最终 H4 仲裁，因此这一步不代表 §10.59 覆盖完成。

本地验证：`node --import tsx --test tests/api/presentation-semantics.test.mjs tests/api/public-activity.test.mjs` — 48/48 PASS；`npm run build` PASS；指定 5 个变更文件 `npx eslint ...` PASS；`git diff --check` PASS。未运行 UI/browser 测试（此切片是纯语义/服务器契约）。当前源改动尚未 commit/push，精确 SHA CI 和部署待进行。提交前门禁已查：`ux-v2` 最新相关 run [43780573479](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43780573479) 对 SHA `02cb61288d19478433cccd2310650c4a41f8cebf` 全绿；当前远端头仅多 HANDOVER 边界提交 `67c21dafaac2643d24a2310c4df6f099ea7946bd`。

当前唯一任务仍为 §10.59 Step 1，直到此提交的精确 SHA CI、Worker 部署与 smoke 通过。交付后下一安全边界继续同一 §10.59 的 Step 2“按服务器结算源接入”；不得另开 Huang Gai 单独任务，也不得把本步骤标为整个 §10.59 完成。
