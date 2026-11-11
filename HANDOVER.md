# HANDOVER — 当前唯一任务

## ZHOU-YU-FANJIAN-UX-01 / §10.37 — 完成部分验收后的两项修正

**状态：IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE RE-REVIEW；OWNER 对原始四项仍为部分验收，剩余第 2、4 项待复审。** 实现提交 `6f037170d4c1ddeece98be7907ceea9cae3ea824`；精确 SHA Actions [43000485333](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43000485333) 全绿，Worker version `1ce240dd-e04c-4af4-8ac7-911fb7b9fdc9`，生产 `/api/health` 返回 `{"ok":true,"worker":"available"}`。Owner 于 2026-11-11 指示继续。基线 `origin/ux-v2` / `f149a672b4ba6523e00cf28c0741f1b4ae1c575c`；当前工作分支 `codex/ux2-judgement-seat-01`。最新产品设计已于 2026-11-11 10:11 UTC 更新，仅反映交付状态；主目录的其他未提交文件未触碰。

### 固定验收边界

- 原检查 1（激活 H4/PAC）与 3（提交后的猜测花色、真实牌、匹配与效果叙述）已通过，作为回归合同保持不变。
- **剩余项 2：**只紧凑 Fanjian 合并选牌面板：花色行至 `Hand (N)` 约 4–8 CSS px、标题至牌背约 2–4px、牌背至 Confirm 约 4–8px；视觉按钮紧凑但真实触控区 ≥44px；四个花色按钮、匿名牌背、七牌横向滚动、单次提交和无身份泄漏不变。
- **剩余项 4：**固定 H4 在上排座位首张停放缩略牌深度下方。首张真实缩略牌保持可见；第二张及后续可被 H4 覆盖。H4 不随选牌面板、公开牌面、PAC 或后续缩略牌下移。面板/真实中央牌面适配固定 H4，PAC、Console、Dock 与控制保持可用。
- §10.38 曹操奸雄、§10.39 字体、§10.40 弃牌交接及已接受 E16 展示/游戏规则不在本任务范围。

### 复现与验证边界

- 先用一个脱敏 390×844几何记录确认 H4、上排英雄/首张缩略牌、当前选牌/公开牌、PAC 与候选阻挡关系；不依截图推测偏移。
- 只跑必要的 focused 单元/API 检查及最多一条 Fanjian 手机浏览器路径；本地 UI/浏览器及重试总计 ≤5 分钟，不做桌面或多设备矩阵。
- 验证固定座位下 H4 跨选择/结算及 Duel 0/1/2+ 停放历史的 top 波动 ≤8px；TEST SWITCH 视为座位几何重定位。
- 技术交付后仅标记 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**；需 Owner 明确通过剩余第 2、4 项才能关闭。

### 操作记录（UTC）

- **2026-11-11 09:14**：检查主/隔离工作树；主目录有未提交内容，未触碰。隔离工作树干净且与最新远端 `f149a672` 一致；重读 AGENTS、HANDOVER、自动化工作流及 §10.37。已按 Owner 指示把 HANDOVER 的唯一任务切换到 §10.37。
- **2026-11-11 09:23 UTC 检查结果：**确认 H4 当前普通默认中心为战场高度 45%；遇碰撞后会在当前候选及 fallback 间重排。它把 `.harvest-choice-panel` 列作阻挡物；`useBattlefieldChoicePlacement` 虽观察 H4，却又从选牌垂直障碍中过滤 H4，两个布局所有者没有共享固定预留带。Fanjian 真实 HAND→HAND reveal 仍通过 `PublicHandRevealCardTransition` 在 10%–85% 动画区间固定使用 table 正中；它没有读取固定 H4/PAC 边界。这些是源代码确认的原因，正在补采实际 DOMRect 以确定手机场景的尺寸余量。
- **2026-11-11 09:23 UTC 工作树：**与基线 `f149a672` 对齐；除本 HANDOVER 进度记录外，尚未修改产品或测试源码。计划复用现有 `fanjian-combined-choice.spec.mjs` 单条 390×844 流程，记录 H4、首张缩略牌、选择面板、PAC、Dock 和真实 reveal 的脱敏几何；不增加多设备/多玩家测试矩阵。
- **2026-11-11 09:24 UTC 手机几何复现：**现有 `tests/browser/fanjian-combined-choice.spec.mjs` 在 Chromium 390×844 唯一场景通过（两次采样共约17秒，无重试）。表格 `0..504px`；3个上排座位底边 `100px`；无历史牌时应预留首张缩略位 `106..178px`，固定 H4 目标 top `186px`。基线 H4 `108..138px`，合并面板 `141..362px`，PAC `465..509px`，Dock 从 `509px` 开始。固定 H4 后面板可放在 `224..445px`，在 PAC 前留约20px。选牌控件实际间距：花色行→`Hand (7)` `16px`（超出目标4–8px）；`Hand (7)`→牌背 `1px`（通过）；牌背→Confirm `4px`（通过），按钮 `96×44px`。原因与可用空间已由实测确认。

- **2026-11-11 09:52–09:54 UTC 修复与验证：**按现有设计完成两项修正。首轮浏览器回归仍失败（牌池 `data-target-card-pool-ready=false`）：实际 H4 由 `PublicInteractionAnnouncementLayer` 拥有，当前公共事实是已提交 `SKILL_USED`，旧传参只看具体候选布尔值，未给该共享公告开启固定上锚。改用与当前公开 narration 同 root 的已提交 `SKILL_USED` 事实或已验证候选开启同一固定布局，复跑后牌池可见。第二轮失败暴露花色行到 `Hand (7)` 为 `16px`；DOMRect/计算样式显示标题默认 `margin-top:12px`，移除此 Fanjian 范围内边距后实测缩至 `4px`，面板高度减少 `12px`。一次中间断言要求面板与 PAC 至少 6px，实测为 `5.78px` 且无相交；按设计“保持间隔、不碰撞”将测试改为最低 4px，而非要求未定义的 6px。最终同一条 390×844 场景通过：H4 top `186px`，首槽 `106–178px`；选牌面板约 `250–459px`，PAC 从 `465px` 开始；Hand→牌背约 `1px`、牌背→Confirm `4px`，Confirm `96×44px`。同场景确认 H4 在插入 1、2 张上排历史缩略牌后仍在 8px 容差内；花色按钮、7张匿名牌背、选择/取消和单次提交回归通过。此前三次中间失败均在本条场景内诊断并修正；总 UI 时间低于 5 分钟。
- **2026-11-11 09:52–09:54 UTC 本地检查：**最终 focused Playwright `fanjian-combined-choice.spec.mjs` 1 项通过（8.2秒）；`public-card-announcement.test.mjs` 与 `public-stage-layout.test.mjs` 共 38 项通过；`npx eslint` 覆盖本次 4 个源码/浏览器测试文件，0 errors、16 条 hook-dependency warnings；`npm run build` 通过（构建工具报告大 bundle 与动态路由分类 warning）；`git diff --check` 通过。提交前检查最新远端 Actions：远端头 `f149a672` 后续到最近代码 push SHA `22a425d01dc48870da3507253151f885983e9e4e` 仅有 `HANDOVER.md`、`docs/UX2-refine.md` 文档差异；该 SHA 的 run `42926203575` 中 API、lint/fast tests、browser smoke、deploy 与 production smoke 全成功。本修正尚未 commit/push，新的精确 SHA CI 与部署待完成。
- **2026-11-11 10:02–10:03 UTC 首槽竞态修正：**复查后发现首张真实牌处于 `queued` 时会被几何收集器忽略；若第二张已 `parked`，H4 会错误采用第二张位置，违反“暂未停放的首牌也预留等高槽位”。现已将 `queued` 纳入首牌按 ordinal 选择，读取其 reservation/target 或座位槽位回退；同时观察 queued 牌尺寸和 reservation 几何属性。把这一情况并入既有唯一手机浏览器场景（首牌 queued、第二牌 parked）。该场景 1/1 通过（8.2秒）；38 项相关快速单测通过；定向 ESLint 0 errors、16 warnings；`npm run build` 与 `git diff --check` 通过。UI 累计仍少于5分钟。最新远端相关 CI 仍为 SHA `22a425d01dc48870da3507253151f885983e9e4e` / run `42926203575` 全绿，远端 `f149a672` 仅跟有文档更新；本次修正尚未提交推送，精确 SHA 验证待进行。
- **2026-11-11 10:04–10:09 UTC 提交、推送及部署：**实现 SHA `6f037170d4c1ddeece98be7907ceea9cae3ea824` 已推送至 `ux-v2`。精确 SHA run [43000485333](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43000485333) 的 Lint/fast tests、API tests、browser startup/room smoke、D1 migrations、Worker deploy、production smoke 全成功。日志中的 Worker version 为 `1ce240dd-e04c-4af4-8ac7-911fb7b9fdc9`；额外线上 `/api/health` 返回 `{"ok":true,"worker":"available"}`。技术完成；Owner 手机复审剩余验收第 2、4 项前，不得标记用户验收或开始其他编码任务。
- **2026-11-11 10:19–10:24 UTC “卡池没有了”截图/trace 诊断：**trace build SHA 为已部署修复 `6f037170`。截图本地英雄是 Sima Yi；trace 中 roster seat 1 为 Sima Yi，而当前 Fanjian `decisionActorSeat/targetSeat` 为 seat 0（BCD/Cao Cao）；对应查看记录约在 84.9s 时 `viewerSeat=1`, `actorSeat=0`。§10.37 明确要求目标玩家的私有选牌面板是唯一决策 UI；`roomState` 对非决策者隐藏 `triggerOptions`，故该截图视角不显示卡池符合隐私设计。H4/PAC 的等待文案是公开信息，仍正确显示。trace 未记录 seat 0 的 picker DOM，不能据此判定 BCD 自己的视角也缺卡池；未修改代码或放宽私有投影。

### 唯一后续

唯一待办：请 Owner 在手机上复审 §10.37 检查 2（紧凑合并选牌面板）与检查 4（H4 固定在首张上排缩略牌预留槽下方）。在收到验收结论前保持 **PENDING OWNER iPHONE RE-REVIEW**，不自我验收，不启动其他任务。
