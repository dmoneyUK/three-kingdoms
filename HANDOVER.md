# HANDOVER — 当前唯一任务

## 最近完成的相关交付

- **§10.51 ROOM-POLL-TRANSIENT-503-RECOVERY-01：** H4 DOM 所有权修复已部署，提交 `6bcef5a3169746edae3edbfc0eab66108f1952b9`；[精确 SHA Actions 43729279654](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43729279654) 全部通过，Worker `22d8cce3-b1cc-4b2d-afcc-8ade1be6d355` 已部署，生产 smoke 与直接首页/health 检查通过。状态 **PENDING OWNER iPHONE RE-REVIEW**。
- **§10.49 CAO-CAO-ENTOURAGE-SIMULTANEOUS-WEI-DODGE-01：** 8 秒共享窗口到期修复已部署，提交 `3053d209aba640ff8280f43f3e4feff91be0a646`；[精确 SHA Actions 43726390974](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43726390974) 全部通过，Worker `fccb97eb-20dd-480e-ba45-aa8f33182896` 已部署。原 owner 手机失败记录保留，状态 **PENDING OWNER iPHONE RE-REVIEW**。

两项修复均未标记 USER-ACCEPTED。另一个旧 §10.49 worktree `/Users/jingedai/.codex/worktrees/ux2-10-49-harvest-20261114` 有未提交原型改动，已检查并保持原样；不得重置、覆盖或未经审阅直接移植。

## 当前唯一任务：§10.53-F1 — H4、PAC 与私有 Console 的验证玩家姓名样式

**状态：** 已获 owner 授权；尚未实施。当前远端基线 `ux-v2`：`6bcef5a3169746edae3edbfc0eab66108f1952b9`。设计依据：`docs/UX2-refine.md` revision `2026-11-15 15:32 UTC`，§10.53-F1 A–D。

### 唯一任务范围

1. 建立可复用的 typed verified-player-copy helper：片段携带权威 `playerId` 与精确姓名；仅当片段拼接后与原消息完全相等时才渲染，否则保留原始完整纯文本。保留 H4 现有 API 与无障碍文案。
2. 在 PAC 生成时用已验证身份构造 heading/stage/text 片段，并在 React 中呈现姓名；不得扫描任意文案、推测身份或泄露 §10.49 私有提交信息。
3. 为 viewer-private Console 的既有权威 actor/借刀 holder 与 target/乐不思蜀顺序参与者添加可验证片段；不解析 `CurrentAction.reason` 或任意技能文案，不改服务端合法性、原字符串、按钮或 aria-live。
4. 用同一 shared player-name class 与 approved muted-gold 字体规则统一 H4/PAC/Console；保持字间距与字词可读，不改三块区域几何布局。

### 验证与交付

- 运行纯片段边界测试、PAC API 隐私/文案测试、定向 Console/H4 测试、构建、diff/lint。
- 最多一个 440px 四人手机浏览器场景；所有本地 UI/browser 运行累计不超过 5 分钟。必要时将未覆盖浏览器面验证记为 SKIPPED，不能扩展测试矩阵。
- 只提交当前任务文件；提交前核对当前 `ux-v2` 最新 Actions。推送后验证精确 SHA 的全部 required CI、部署与生产 smoke；结果保持 **IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW**。

### 恢复点

安全边界已按最新设计重审 §10.49 和 §10.51：两者修复均已技术交付，但都仍待 owner 手机复验。开始 §10.53-F1 前，基于 `6bcef5a` 检查干净任务工作树及 `game/public-h4-copy.ts`、`game/public-activity.ts`、`app/public-activity-chip.tsx`、`app/page.tsx` 的现状；不要沿用旧版 UI 或重做已交付修复。
