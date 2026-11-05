# HANDOVER — 当前执行交接

## 当前唯一任务：ZHOU-YU-FANJIAN-UX-01 / §10.37

**状态：实施中。** 严格执行最新 owner-approved one-window / one-submit 设计；仅新的周瑜反间使用组合流程。旧存档 `stage:"suit"|"card"` pending 必须仍可完成。不得把曹操奸雄资格问题并入本任务。

### 设计与分支基线

- 最新设计：`docs/UX2-refine.md` revision **2026-11-04 23:38 UTC**，远端 `ux-v2` SHA `407a5878`；§10.37 单个组合选择面板、一次 `apply_trigger`，第 4 个和后续手牌位置匿名横向滚动。§10.38 是单独任务，明确不在本范围。
- 当前源码基线：`587d00f50204716ec1151d23881e838b9052bbc2`，工作分支 `codex/ux2-judgement-seat-01`，目标 `origin/ux-v2`；开始前工作树干净，远端已同步。
- 最近相关精确 SHA CI：`bf327e76b11efcfefae2f14bc0f7ccfa8090d521` / Actions `41935465005` success；该结果是 §10.36.1 的验证，不验证本任务。

### 当前实现进度（2026-11-05）

- 已修改 typed trigger/pending 与序列化边界，增加组合选择约束和 `fanjian_combined` outcome，同时保留旧 `suit`/`card` pending 分支。服务端依据当前 pending、双方状态、provider option 和匿名 `hand:index` 重验；单次 pending claim 后转移同一张牌、公开一次 reveal，并进入既有伤害/恢复流程。
- 已完成组合面板、匿名牌背横向池、技能重按本地取消与隐藏 Cancel 控件；提交前选择仍只在本地，公开场景、H4/PAC 决策由服务端因果投影提供。
- 验证记录：构建通过（含既有 chunk-size / route-classification 提示）；`public-activity.test.mjs` 19/19 通过；定向 API 首跑发现 1 条旧断言要求“无因果场景”，按新设计更新为检查共享的 `SEQUENTIAL_CHOICE` 场景后，60/60 API 用例通过；定向 ESLint 0 errors、3 warnings（2 条既有 `app/page.tsx` React Hook 警告，1 条 fixture 文件未配置提示）。
- 390×844 单一手机回归第一次发现第四张 44px 牌背超出 183px 可视轨道 2px；将此面板专属轨道 gap 从 3px 缩至 2px（触控卡位仍为 44px）后，同一场景通过。最终 CSS 后 `npm run build` 复跑成功；累计本地 UI/browser 时间约 20 秒，低于 5 分钟上限。
- 当前改动包括 HANDOVER、10 个源文件、4 个 API 测试文件及 2 个浏览器测试文件；尚未提交或 push。上一 SHA `bf327e76…` 的成功 Actions 仅验证 §10.36.1，不验证 §10.37。

### 验收与交付界限

证明一次提交、部分/重复/陈旧选择 fail closed、真实卡只公开 reveal 一次、旧进行中 pending 可完成、matched/mismatched damage 与原有续接不变、actor-only opaque choices、准确 H4/PAC/私有 Console。最多一个 390×844 本地手机浏览器场景，包含全部重试累计不超过 5 分钟。当前正在收口编译及测试；之后只跑目标 API/unit/privacy、一次限定手机浏览器场景、必要 build/lint/diff check，推送 `ux-v2` 并核对精确 SHA Actions、Worker 部署和 production smoke。状态不得自我标为 USER-ACCEPTED。
