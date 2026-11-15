# HANDOVER — 当前唯一任务

## §10.49 CAO-CAO-ENTOURAGE-SIMULTANEOUS-WEI-DODGE-01 — 原始 P0 两项修复

**状态：** CURRENT / NOT ACCEPTED。当前仍有两个由用户复现的阻断，必须在同一原始任务内修复；不得另建 F1 或改变已接受的窗口规则。

**最新设计：** `docs/UX2-refine.md` revision `2026-11-15 18:02 UTC`。§10.49 原始任务定义为 Liu Bei 共享 Shu Attack 到期结算卡住，以及 Dying Peach 中真实 Peach 的 Confirm 被禁用。§10.51 依最新设计为 USER-ACCEPTED / CLOSED，不是待修任务。

**刚完成的前置任务结果：** §10.54 已推送并部署，代码 SHA `79efde4888fee3cd9ab900541c36b0b2d719a822`；[精确 SHA Actions 43743762710](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43743762710) 全部通过；Cloudflare Worker Version `8f8114de-219b-4dba-b0e4-8b3f7f64adb9`；生产 `/` 与 `/api/health` 冒烟通过。状态为 IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW。该任务一次本地 440px UI 尝试在最终修正前失败，达到 5 分钟 UI 预算后未重试，需由用户手机复审。

**本任务两项阻断与恢复点：**

1. **Liu Bei expiry race：** 8 秒 `INFLUENCING_ATTACK` 中一个合法 Zhao Yun Attack intent 已提交、Guan Yu 沉默；到期时普通同 key GET 正在 flight，`fetchRoom` 返回 `false`，共享窗口 watcher 因此清掉唯一 timer 并退出，未发出 `advance_timers`。修改 `app/page.tsx` 的 shared-window expiry watcher：预检或结算后的验证 GET 若因单 flight/临时错误返回 false，必须对同一经服务端证明的 `windowId + deadline` 有界重试；维持单一 POST、服务端 CAS、身份/epoch 校验。窗口改变/消失或游戏结束后才终止。不得在 GET 写入或自动 Skip。
2. **Dying Peach disabled submit：** Huang Gai 0 HP 的合法 `DYING_PEACH` 窗口中，Sima Yi/Cao Cao 手持真实 Peach，但旧客户端依赖 `give_peach`，当前 `CurrentAction` 合法提交是 `respond`，导致 Confirm 禁用、零 intent 到达服务端。使真实 Peach 选择经现有 viewer-authorized `respond` capability 到达既有共享窗口提交 API；保留单赢家、8 秒服务器 deadline、真实牌归属、原救援顺序、嵌套恢复触发及失败死亡规则。

**边界与验证：** 只按 `docs/UX2-refine.md` §10.49 原始任务的逐项方案实施。保持三种共享响应模式共用单一窗口语义；一次只结算一个合法物理响应；落败 intent 不耗牌；不得泄露其他玩家 intent/手牌，不改变规则、计时或原有 Negation。增加确定性单测/API 覆盖重叠 GET 到期、验证 GET 重试、合法 Peach `respond`、重复/迟到/错误提交和 one-winner；基本 build、定向验证、`git diff --check`。本任务本地 UI/browser 总计最多 5 分钟，超时即停止并报告 SKIPPED。之后提交推送，验证精确 SHA 所有必需 CI、D1/Worker 部署与生产 smoke；记录真实结果，不自我验收。§10.49 仅能由用户对 Liu Bei 和 Dying Peach 两场景均完成真实 iPhone 复审后关闭。

**工作分支：** `codex/ux2-1049-expiry-20261115` → `ux-v2`。先保留工作区改动并核对远端，再开始源代码修改。
