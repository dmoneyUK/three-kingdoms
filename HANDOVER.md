# HANDOVER — 当前唯一 Coding Agent 任务

## FANJIAN-PUBLIC-H4-SETTLEMENT-CONTINUITY-01 / §10.42

**状态：OWNER REPORTED / NEXT IMPLEMENTATION — NOT IMPLEMENTED (2026-11-12 19:34 UTC)。** 唯一有效任务：修复周瑜反间**一次提交结算期间**的 H4 多次抢占/闪烁/隐藏，以及 H4 使用**上排玩家第一张停靠缩略卡高度**的固定上部定位。完整约束、诊断、隐私/验收条件见 [docs/UX2-refine.md §10.42](docs/UX2-refine.md)。**不要同时开始 §10.43**（花色高亮和可见 Confirm 高度）——它是下一条独立串行任务，已在设计文档中排队。

### 最新基线与不得重开的范围

- **远端基线：** 本 HANDOVER 任务规划前的代码 HEAD `0bb8029edad8c8d7ee6b84844639a61614ea1409`，UX2 设计更新 `e35cbeb2d6e0b8fb227847500843f4c0f0d28b12`（更新后以实际最新远端 SHA 为准）。在执行前按 `AGENTS.md` 检查/同步 `ux-v2` 工作树，保留所有他人未提交改动，不 reset/clean/stash/force push。
- **上一任务已交付、尚待真实手机验收：** `PUBLIC-H4-CARDFACE-RECENCY-REGRESSION-01 / §10.41` 代码 `0581448e906ae7406c24e98b525f4ab5e9f031be`，精确 SHA Actions [43195310553](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43195310553) 通过并部署 Worker `e5f1d2f0-755e-4adb-88a4-e0992c651470`，线上 health 通过。其修复的是**结算后出现新的独立 Attack→Steal** 时旧反间占用 H4/真实卡的回归。本次日志**没有**测到随后 Attack→Steal，不能自行将 §10.41 标记通过或失败。历史逐步实现记录留在该 commit 的旧 HANDOVER Git 历史，此处不重复旧执行流水。
- **维持已接受范围：** §§10.37/10.39 均 `USER-ACCEPTED / CLOSED`（2026-11-12 09:07 UTC）；M4 E16 单张真实公开 HAND→HAND 卡、已完成的 Fanjian 一次原子合法选择和选牌隐私，PAC/Console、牌的实际所有权/伤害规则全部保留。§§10.38/10.40 各自待 iPhone 验收。

### 新用户实机问题与不可忽略的 trace 事实

来源：iPhone 图片 `IMG_4257.jpeg`、用户上传 `wtk-game-ux-trace-2026-11-12T19-29-11.327Z.json`；日志版本正是 `0581448e`，环境 CSS viewport width 440，游戏桌几何约 440×474，日志包含**两场独立测试房间**。原始附件可能不在 Agent 本地 Git 工作目录，以下事实足以构造精确回归，不能假定已入库：

1. 第一场同一技能结算（elapsed **52.195s**）：`card:reveal:EightTrigrams` `8cfdcc5d…`，真实最终结果 `8863e222…`（猜♦、揭2♠）、伤害事实 `a62c370a…`。H4 key 在 **52.206** 先选伤害 → **52.248** 选完整结果 → **52.262** 排版长高 70.5px → **52.414–52.663** 因 `no-safe-collision-free-placement` 被隐藏（`journey-target` 障碍）→ **52.863** 改选揭牌事件 copy → **56.243** 再回到伤害。完整结果首次只出现约 **166ms**，读不清。
2. 第二场不同房间结算（elapsed **128.526s**）：`card:reveal:Dodge` `96b50480…`，结果 `8a564e2e…`（猜♥、揭J♦）、伤害 `e8b47bc1…`。H4 **128.539** 伤害 → **128.598** 结果 → **128.751–128.917** 隐藏 → **129.001** 重现 → **129.199** 回伤害。再次证实单 root 的结果/damage/reveal 反复抢占 + geometry hide。
3. `public-event-presentation-timer` 对 reveal 报 `durationMs:4000` 但 **`timerMode:"zone-transition", status:"zone-transition-exempt"`**，不是 H4 真正显示 4 秒的证明。
4. 上排 Seat 实测 bottom **100px**，H4 在结果阶段 top **186px**（还出现 198.5px/195px 跳位）。`app/public-card-display.tsx` 的 `PARKED_CARD = 48×72`、`REVEAL_CARD = 90×135`、`HARVEST_MOBILE_RESPONSE_CARD = 32×48`；`fixedUpperHistoryAnnouncementAnchor()` 的 fallback 是 seat bottom + 6 + **72px 停靠小卡** + 8 = **186px**。**现有代码确实按48×72缩略卡预留，不可谎称是用完整牌高度。** 用户视觉上希望再高、只空出**真正第一张停靠缩略卡**的占位，不是一个完整中场 CardFace/Hand card。需测真实第一张 parked miniature 的有效大小和多余间距，安全上移但不能遮第一张缩略卡；碰撞若不可避免须出具几何证据，不能删碰撞判定瞒过测试。

### Coding Agent 明确执行步骤（仅此任务）

**Step A — 先复现并锁定第一错误分支。** 阅读 `AGENTS.md`、`docs/UX2-refine.md §10.42` 与这份 HANDOVER，然后审阅 `app/page.tsx` 的 `fanjianSettlementNarration` / `currentInteractionFact` / `selectedPublicCardAction` / `skillEffectSettlementCandidate` / `activeSkillEffectSettlement`；审阅 `app/public-card-display.tsx` 的 H4 事件 copy 生命周期、`fixedUpperHistoryAnnouncementAnchor` 和中心 zone-transition 占位。一个四人 room 的确定性 Fanjian 真实服务端结算：激活 → 目标私密选花色+一张隐藏源手牌 → 服务端 commit 一次 → 真卡 PUBLIC HAND→HAND reveal → mismatch damage + possible post-damage response。记录每次 H4 的 root/event copyKey、何时变 visible/hidden、最终结果可见时间和真实 first parked-mini slot geometry。确认导致多 owner 轮换和 no-safe-band 的**第一原因**，不靠猜 CSS。禁止打印私密未揭手牌。

**Step B — 合并同一反间结算的 H4。** 在服务端已证明 `publicSkillEffectSettlement` + 同 root 真实揭牌 + damage fact 后，显示**一条**稳定最终 H4：猜什么花色、实际揭开牌的真 rank/suit/name、是否匹配、真实 0/1 或伤害防止结果；activation H4 在选择前正常保留。不得闪成先 raw damage、再 final、再 generic reveal、再 damage。将同 root 的事实聚合在一个语义 owner/固定结果 eventCopyKey；一个后续**独立**已提交 Attack/Steal 仍能按 §10.41 正确 supersede；poll、response timer、同 root damage、reveal、TEST SWITCH 不应把已提交 final 又退回较旧的事实。

**Step C — 修复真实 H4 可见寿命与上部几何。** 从 **final H4 首次实际 visible** 起，在普通手机情形保持至少约 **3 秒**连续可读（不是从 API 返回时计；新独立 public play 可优先取代）；无 `no-safe-collision-free-placement` 隐藏→重现、无 y186→198.5→195 不必要跳位。H4 紧贴**第一张真实 parked MINIATURE 的底部**，留约 4–8px；绝不以 REVEAL_CARD (90×135) 或 Hand 68×102 作垂直预留。尽量量取实时 miniature；无实体时与真正停靠尺寸一致；若 Seat/mini/完整结果/CardFace/PAC 在 440×474 发生真实不可解冲突，记录几何限制并使用安全的两行/compact 文本，不得覆盖第一张缩略卡、PAC、Confirm、真实中心 CardFace。不得通过局部强制隐藏、原地缩小真实卡牌、加 z-index 或弱化碰撞断言掩盖问题。不改游戏计时、POST 合法性或服务器伤害。

**Step D — 验证。** 少量单元测试证明：precommit activation、suit match/no-damage、mismatch/damage、damage prevented、同一次 root 三种不同事实进入 H4 时只产生一个 final public key、poll/Retaliation/viewer switch 不重排 final；新的独立 Attack 必须按 §10.41 成功 takeover。**一场**四人 440px 手机 browser scenario：真实 E16 card 身份唯一，PAC/Console 按服务器决定，完整 H4 无闪烁且可见≥3s，先占一张 mini 卡高度、第一 mini/中心真实卡/PAC/Console 不碰撞，短手机页面不裁切；必要时只补一个 390px 几何检查。本地 UI/browser 运行与重试累计 **≤5分钟**；另外执行适用的 focused tests、`npm run build`、`git diff --check`、CI required jobs；如果本地 ESLint 又见既有 Node26 stack overflow，记录原样并以 exact-SHA Actions gate 为交付证据，不跳过其它检查。

**Step E — 交付门槛。** 实际修复 diff、最初失败逻辑、root/result/reveal/damage ID、修改前后 H4 key 序列/可见时长/mini 几何、局部 test 数和输出、准确提交 SHA、与其匹配的 CI、Worker deploy/production smoke 全部写回 HANDOVER。只可标记 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**，不能自行 PASS。不要开始 §10.43；下一轮再派发。

### 下一个独立工作（仅索引，不得抢跑）

`docs/UX2-refine.md §10.43`：黑色 ♣/♠ 白色背景遮盖 selected 状态，需要明确高对比边框 + 选中符号；可见 Confirm 高度从 44px 压到约 29–30px，但**真实触摸区域仍 ≥44px**。这不是当前 §10.42 的附加编码范围。

