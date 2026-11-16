# HANDOVER — 当前唯一任务：§10.60 iPhone Safari 原生手牌滑动（原任务未验收 / 待修复）

**状态：ORIGINAL §10.60 OPEN / NOT ACCEPTED — SAFARI-SPECIFIC CORRECTION REQUIRED。** Owner 2026-11-16 01:26 UTC 再次质疑真实 iPhone 仍不能正常滑动。**没有一份对最新 `4e61022` 的真实 Safari 精确触摸 trace**，不能谎称已在该版复现；但源码存在高度可疑且与已公开 WebKit 缺陷完全同形的结构。前一版 `02cb6128` 已被 Owner 明确报告 Safari 仍不滑，最新 `4e61022` 仅通过 Chromium 模拟手势，**不是 USER-ACCEPTED**。

## 已交付的技术结果（保留，不再误当手机验收）

- §10.60 75% 最小面宽推进（68px face → ≥51px x-step）、11 张卡可 overflow、原生横滑基础代码已交付；前次 `02cb61288d19478433cccd2310650c4a41f8cebf`（Actions [43780573479](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43780573479)）已部署，但 Owner 报告 iPhone 失败。
- 最新二次补丁 `4e61022fc9177de8319cbef432a8a84c2d1e6424` 已推送部署；[Actions 43785016336](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43785016336) 全绿，Worker `7cf33a66-5c52-4db2-a626-2c7e6b801b6e`；只给 .game-card / 信息 / 反选触摸目标添加 `touch-action:pan-x`，继续保留滚动节点 `pointer-events:none`。Chrome DevTools Protocol `Input.dispatchTouchEvent` 11 卡、440px 浏览器 1/1 PASS，技能按钮命中 PASS；**这只能证明 Chromium，不证明 Safari 滚动可用**。
- §10.60 原设计：`docs/UX2-refine.md` 原 §10.60（保持 68px 牌、≥75% 步长、原生横向 overflow、首末卡可达、滑动不误选、点按仍选择、技能装备仍可点；隐私/服务器权限不变）。§10.56 Inspector 已 OWNER CLOSED，§10.59 等任务独立，不能借本次扩大范围。

## 本次 Reviewer 源码与 WebKit 对照——先验高可信假设，非已经证明的 Safari runtime

**关键可验证冲突：** `app/sequence-overrides.css` L818–830，`.local-hand-rail` 是 `overflow-x:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x` 的**真正滚动容器**，但是它自身被设成 **`pointer-events:none`**；只有 `.card-slot` 恢复 `pointer-events:auto`，新补丁再给子按钮 `touch-action:pan-x`。WebKit Bug [183870](https://bugs.webkit.org/show_bug.cgi?id=183870)（OPEN，2025-11 仍有复现讨论）专门记录 **iOS 无法原生滚动 pointer-events:none 的 scrollport，即使子元素 pointer-events:auto；Chrome/桌面 Safari 可能正常**。因此「对子按钮加 pan-x」未移除真实的 scrollport hit-test 故障。HANDOVER 已记录 Agent 曾试验给整个 rail `pointer-events:auto`，导致 rail 上部透明 lift clearance 截获 `.hero-skill-button`/装备点击；又退回 pointer-none，形成 **Safari 滚动 vs 技能可点** 二选一陷阱。这是**最优先验证**的原因，不能先宣称唯一已证实根因。另须排除真机 overlay/disabled card target、祖先 touch-action/overflow 与 scrollLeft 被重置。

**新唯一原任务的精确下一步（禁止再跑同一 Chromium CDP 手势当最终证明）：**

1. **Safari 实机诊断/A-B，先证明具体事件路径：** 11 张真实 Hand 并确保 `scrollWidth>clientWidth`，在真实 iPhone Safari Web Inspector 或隔离的 DEBUG-only probe 记录 `touchstart`/first `touchmove` 的 `elementFromPoint` + `event.target/composedPath`、对应 target 和 scrollport 的 computed `pointerEvents/touchAction/overflowX`、`event.cancelable/defaultPrevented`、手势前后 `rail.scrollLeft`、点击上层技能是否仍命中。**仅用于诊断**临时把 rail `pointerEvents=auto` 再滑：若 Safari 立即可滑而技能区域被挡，则 WebKit 183870 成立；再复原。若仍不可滑，沿实际命中 DOM/事件拦截链测量其他 overlay/祖先/disabled 按钮问题，不能盲目认定。
2. **从结构上拆开“可滑卡牌触控区域”和“上方透明抬升留白”：** 让接受真实横向手指触摸的 **原生 scrollport 自己**是 `pointer-events:auto` 的真实 hit target（或使用经过 iPhone 验证的内层 pointer-auto 自滚动节点），并且**其命中矩形不能覆盖上方技能/装备有效点击区**。透明 lift clearance 应当是独立 `pointer-events:none` 的视觉区域/层，不能再作为必须 pointer-none 的 scrollport 本身；保留已选卡完整抬升和真卡 CardFace，不凭猜测调整全局 z-index、禁用技能点击或用 JS `touchmove` 假滚动替代。必要时把实际交互 scrollport 与视觉抬升层/包裹区域拆分，使用实时 DOMRect 证明裁切/层叠安全；不能为了通滑而截断所选卡或牺牲其他 accepted Dock。具体最小 DOM/CSS 变更由 A/B 命中测量确定，优先单个复用滚动结构，不做 Hero 特判。
3. **补 Safari/WebKit 回归，不只 Chromium：** 一次真实 iPhone（或可信 WebKit 设备）11 卡向左滑至少两次，`scrollLeft` 实际前进、最后一张完整可见、未误选；末张点选/复选正常；随后点击两个上方技能/装备按钮命中正确；无整页横溢和两指缩放窃取。同步维持 Chromium unit/DOM 和原 `local-dock-hero-hierarchy.spec.mjs`，但 **CDP Chromium 单通过不能关 §10.60**。应比较 touchstart 时真实命中节点与祖先，触摸 target 不是 scrollport 的情况也需证明其最近可滚动祖先能收到 native gesture。
4. **发布边界：** 若是真机 A/B 证实后实施，提交同一 §10.60 代码与测试到 `ux-v2`，定向 unit/lint/build、`git diff --check`、精确 SHA Actions/Worker/production smoke；在本 HANDOVER 记录测量、根因可信等级与实际验证设备。保持本任务 **IMPLEMENTED / DEPLOYED — PENDING OWNER REAL-iPHONE REVIEW** 直至 Owner 明确 PASS。若拿不到 Safari 诊断，不要继续反复改 CSS并宣称解决；明确阻塞和最小需 Owner 采集的信息。
5. **互不干扰：** 不开 §10.60-F1，不更改独立 §10.59 H4、已接受 §10.56 Inspector、待做 §10.57 pooled buttons、§10.61 等；不 reset/clean 其他 Agent worktrees。其余 UI/browser 本地回归合计 ≤5 min；必要的真实 iPhone 外部验收不算本地 UI 矩阵。

**Reviewer 结论：未接受 / 必须在真 Safari 上先做 scrollport pointer-events A/B，修复滚动容器和技能热区重叠结构。** 这份交接是当前同一原任务的下一执行步骤，不是新功能批准。
