# HANDOVER — 当前唯一任务

## PUBLIC-H4-CARDFACE-RECENCY-REGRESSION-01 / §10.41

**状态：IN PROGRESS — 最小实现与聚焦回归已写入工作树；尚未完成本地验证、提交或部署。**

**基线：** `ux-v2` 远端设计提交 `61b35e2e4cc936f19ca70b86bcc8838d22d4edd1`，设计修订 `2026-11-12 09:07 UTC`。此前 Heroic 公共等待提示修复 `945bbe87a14f4630e956e34a6132c463c4f7e40a` 的精确 SHA Actions `43131527006` 全绿并部署 Worker `e75fb436-9301-4eeb-b138-f38c49d234ae`；新提交后的 CI 尚未触发。

**目标：** Fanjian 结算后，新的、服务器证明的公开 Attack/Steal 必须接管 H4 和真实物理卡面；保留 Fanjian 结果短暂可读。不得改变玩法、公共/私有信息、卡牌身份、H4/PAC 布局或既有已验收功能。

**研究结论与方案（§10.41）：**

- 旧 Fanjian 结算候选只验证自身证明，没有在较新的公开出牌提交后失效；它在候选链中先于当前 `rootAction`，并持续覆盖新卡。
- 结算淡出计时依赖 `publicCardDisplayReady`，但无卡面的 Fanjian 结算没有 `motion`，无法达到 Ready，因此旧候选可长期滞留。
- 新旧 H4 还可能经 `currentInteractionFact` 回退到旧事实；需使用同一服务器公开 timeline 的唯一事件顺序，淘汰早于当前真实公开出牌的旧事实。
- 最小修复：复用 `selectPublicAnnouncementCandidate()` 的唯一 root/checkpoint 与“较新真实公开 card play”仲裁淘汰旧结算；将 Fanjian 短读/淡出生命周期独立于卡牌 renderer Ready；确保旧事实不再占有 H4。仅由现有 `PROVEN rootAction` 与真实公开 `card:play` 提供新卡所有权。
- 2026-11-12 09:44 UTC：`app/page.tsx` 已加入对 Fanjian settlement 和旧 interaction fact 的公开唯一事件顺序淘汰；无卡面结算的短读/淡出计时已脱离 `publicCardDisplayReady`。已添加 selector 单测，以及 440×766 单场景浏览器回归（Fanjian → Attack/Dodge → Steal/Negation → 旁观者切换）。
- 2026-11-12 09:45 UTC：`git diff --check` 通过。直接 `node --test` 因未启用仓库 TSX loader 在加载模块阶段失败；改用仓库 loader 后，新增用例初次失败（测试把普通信息事件误当成公开 card play）；修正输入后 `node --import tsx --test --test-concurrency=1 tests/public-card-announcement.test.mjs` 28/28 通过。现在运行单个移动浏览器场景；UI/browser 本地累计预算上限 5 分钟。
- 2026-11-12 09:48 UTC：浏览器首跑发现结算 fixture 原地修改快照导致 `useMemo` 未接收新引用；改用不可变快照更新。第二跑已验证旧 Fanjian H4 消失、Attack 的实际物理卡面与公告出现；只因预期词语写成 `targeting`、实际合同文案为 `on` 而失败。已据实修正文案断言，同一 440×766 场景第三次运行确认后续 Steal/Negation 和旁观者视角。此前两次场景合计约 20 秒，仍低于 5 分钟总上限。
- 2026-11-12 09:49 UTC：第三次单一 440×766 浏览器场景通过（1/1，5.5 秒）：Attack 卡面/H4、更替后的 Steal 卡面/H4、Negation 期间和 p4 旁观视角均通过。`npm run build` 通过。针对性 ESLint 在 `app/page.tsx:3747` 的 `react-hooks/rules-of-hooks` 内部 `countPathsToEnd` 发生 `RangeError: Maximum call stack size exceeded`，未生成 lint 诊断；正在与无本次改动的基线副本对比，判断是否由这次组件路径新增触发。此前 browser 尝试与重跑合计约 30 秒，累计仍低于 5 分钟。
- 2026-11-12 09:51 UTC：使用相同 ESLint 命令检查 HEAD 基线 `app/page.tsx` 的临时副本，发生相同 `RangeError`、同一行与同一规则，确认是本机 Node 26 / ESLint 规则栈深限制的既存工具故障，不由本次 diff 引起；临时副本已删除。新增单测复跑 28/28 通过，浏览器测试文件与单测文件 ESLint 通过，`git diff --check` 通过。实现 diff 已逐段复核；最新相关 GitHub Actions `43131527006` 仍为 success，准备提交本任务并等待新 SHA 全部 CI/部署。

**步骤记录：**

- 2026-11-12 09:30 UTC（约；该轮早期命令未逐条取时）：读取并比较远端分支。工作树无未提交改动；远端只比本地多一个设计文档提交，安全 fast-forward 至 `61b35e2e`。主目录已有改动未触碰；完整复习 §10.41、AGENTS、当前 HANDOVER 与自主工作流。最新相关代码 SHA `945bbe87` 的 Actions `43131527006` 成功，CI/生产 health 绿色。
- 2026-11-12 09:32 UTC：检查 `app/page.tsx` 候选优先级、settlement lifecycle、H4 来源和共享公开事件仲裁；上述两个根因与旧事实回退路径均在当前代码重现。随后完成上方所记的源码与回归测试改动。

**验证与交付要求：** 针对公共候选仲裁/无卡面结算保留行为加聚焦回归；运行相关快速/API 测试及单个手机浏览器场景（本任务所有本地 UI/browser 尝试总计 ≤5 分钟）。随后运行必要 build/lint、检查 diff，推送 `ux-v2`，观察该精确 SHA 的全部必需 Actions、Worker 部署和生产 smoke。记录前后候选事件 ID、H4/renderer/card ID、检查结果与 Worker 版本。

**验收边界：** 完成后标记 `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`；不得自行标记用户验收。§10.37、§10.39 保持原有 `USER-ACCEPTED / CLOSED`，本任务不得重开它们。
