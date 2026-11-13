# HANDOVER — 当前唯一任务

## FANJIAN-PUBLIC-H4-SETTLEMENT-CONTINUITY-01 / §10.42

状态：NOT ACCEPTED / CORRECTION REQUIRED；诊断开始，尚未修改实现、测试或部署。

设计依据：`docs/UX2-refine.md` 2026-11-12 23:47 UTC，§10.42 原任务。工作树 `/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01` 已安全快进至 `45c8770ea516311c702d2605a85701bb6a0cbc45`；主目录的未提交改动保留。

当前发现：`PublicHandRevealCardTransition` 的 `measure()` 会在 ResizeObserver 和 H4 MutationObserver 回调中改变 `public-hand-transfer-avoids-h4` 类及路线 CSS 变量；layout effect 又依赖 `players` 与 `myTableIndex`。这些是可能导致动画重启或路线变化的代码风险，三次展示的实际触发原因尚未通过动画事件证实。H4 固定上方位置的候选偏移仅 `[0]`。设计记录的手机场景可用走廊约 139.5px，高于此值的 156px 卡牌无法同时满足间距。

下一步：按 §10.42 Gate 1 记录公开事件的 animationstart/cancel/end、组件重建与路线变化，在真实反间选择 ♦、J♣ Attack、伤害及 Retaliation/Skip 场景判定实际原因；随后完成单次路线生命周期和 90×135px 安全几何，验证 H4 连续可见及观察者切换。所有本地 UI/browser 测试总预算 5 分钟。尚未运行本任务测试、提交、push 或部署；不得声称已修复或验收通过。

2026-11-13 00:01 UTC：已构建当前代码并运行一次真实 Worker/D1 手机场景（Playwright 报告 12.7 秒，累计 UI 预算约 13 秒）。服务器提交 ♦ 对 J♣ Attack，生成真实公开 reveal `b757e336-74fe-4a56-a995-3723b1dc49bf`、物理牌 `fanjian-lifecycle-j-club`。DOM 记录挂载时 animation 为 `revealedCardToHand`，约 3.4ms 后 H4 出现导致 class/animation-name 切到 `revealedCardToHandAroundH4`；本次记录 1 次 animationstart、1 次 animationend、1 次挂载和卸载，未复现三次完整循环，其他触发点仍未知。诊断用例 `tests/browser/fanjian-lifecycle-real-gameplay.spec.mjs` 为本任务未提交改动；尚未修改产品代码或部署。

2026-11-13 00:13 UTC：已实现待验证修正：手机 HAND→HAND 公共牌面 90×135；启动前预计算并固定动画路线，停止通过 H4/尺寸观察器在动画中改名或改路径；对同一 room/event/card 增加启动和完成去重，记录公开生命周期 trace；视角改变使锁定座位不再对应时安全终止展示。新增仅测试能力下的 seeded controller 以实际点击 TEST SWITCH。真实 Worker/D1 场景已证明 ♦/J♣、1 点伤害、Retaliation/Skip，红黑选中与 Confirm 尺寸，以及三次 TEST SWITCH 后无重播；一版实测 H4 70.59px、卡牌 90×135、H4 top 186、卡牌 top 266、PAC top 435，完整文字连续采样 3.9–4.0 秒。已发现旧版本在动画中切换视角可能飞向旧座位，正在验证中途切换的安全终止与正常结束的正确目标；不得宣称最终通过。此前一次诊断与三次针对同场景回归，浏览器时间约 48 秒；build、聚焦 ESLint 和 30 项 selector/route 单测通过，全部变更尚未提交或推送。

2026-11-13 00:24 UTC：完成真实服务器 440×766 场景的正常完成及动画中切换两条路径：前者一次 start/end、真实牌到目标、一次 retirement，三次视角切换后 H4 同一键连续可见约 6.2 秒；后者一次 start、视角改变后主动安全结束并一次 retirement、不重播，H4 连续可见约 5.2 秒。§10.43 花色与 44px 点击/30px 画面检查通过。发现并修复 H4 在真实牌退场后仍把缓存中央牌位置当障碍导致切换后隐藏。随后按短屏风险运行 390×700 探针：反间选择面板 footer 拦截 Heart，点击 60 秒超时，尚未进入结算或获得该尺寸几何；未强制点击。当前代码仍需检查无足够走廊的 `Math.min` 回退，短屏问题未修复；不得标记交付。累计本地浏览器时间约 200 秒，剩余约 100 秒；构建、聚焦 lint 及 30 项相关单测已通过。所有改动仍未提交、push 或部署。

2026-11-13 00:27 UTC：短屏正式点击尝试在 390×700 因 chooser footer 拦截 Heart 按钮超时 60 秒；没有强制点击。随后用真实服务器 API 仅为测量提交选择，得到 battlefield 390×360；H4 x81–309/y180–266.2，90×135 牌 x150–240/y161–296，PAC x25–365/y304–364.8，牌与 H4 重叠，H4 与 PAC 留两侧 8px 后仅约 21.8px 高。截图 `/tmp/wtk-fanjian-short-geometry.png`；日志 `/tmp/wtk-fanjian-short-geometry.log`。已在 §10.42 记录待 owner 决定的短屏布局；440px 修正、H4 stale-anchor 修正、测试和仅测试用 seeded controller 均为本工作树未提交改动，`Math.min` 短走廊回退仍不安全，不能 push/deploy 或宣称完成。动画中切换视角目前提前安全结束展示，不继续飞向切换后座位，此限制须对照连续路线合同解决。短屏几何测量通过 API 绕过的是不可点击的 chooser，仅为诊断，不是 UI 验收；本任务 UI/browser 累计约 220 秒，上限 300 秒。
