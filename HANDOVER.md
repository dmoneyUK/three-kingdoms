# HANDOVER — 当前唯一任务

仓库：dmoneyUK/three-kingdoms · 目标分支：ux-v2
工作树：/Users/jingedai/.codex/worktrees/ux2-judgement-seat-01 · 本地分支：codex/ux2-judgement-seat-01

## T6 — PUBLIC-PAC-REVEAL-ORDER-01（§10.30）

**当前状态：IMPLEMENTED / DEPLOYED — READY FOR OWNER iPHONE RE-REVIEW。此前的 owner FAIL 仍未解除；不得标记 USER-ACCEPTED。**

### 最新代码和部署

- 源码 SHA：178d3fe76e2498884f4dc884aa445cfa59c9bca8，已推送到 origin/ux-v2。
- 精确 SHA GitHub Actions：41559882924，SUCCESS。Lint/fast、Browser startup smoke、API、deploy 四个 job 均通过；部署 workflow 生产 smoke 通过。
- Worker 版本：89fa136d-342e-42b5-ad14-09b749685a8a。2026-11-03 01:40 UTC 生产 /api/health 返回 HTTP 200，{"ok":true,"worker":"available"}。
- 该源码交付恢复服务器证明的已提交无懈可击历史，并修复深层组牌旁白 targetIndex 作用域错误。它也包含先前完成的共享 CardFace/Frame/H4/PAC 几何和 Gan Ning 转换结算修正。

### 当前代码 SHA 的定向手机尺寸浏览器证据

- 2026-11-03 01:34 UTC：W4 Gan Ning 转换【过河拆桥】→公开【闪电】结算场景，1/1 通过，15.1s。检查了真实实体牌与有效牌证明、公开判定牌弃置、两个视角的结算 H4 和隐私边界。
- 2026-11-03 01:36 UTC：【万箭齐发】+已提交无懈可击，390×844，1/1 通过，9.1s。CardFace 为 90×135；H4 y=254.4–283.6，卡牌 y=291.6–426.6，PAC y=435.6–492.5，卡牌-PAC 间距 9px。CardFace、H4、PAC、倒计时共享同一布局身份；提交无懈可击后根牌、H4、PAC 仍正确。
- 2026-11-03 01:37 UTC：【南蛮入侵】REVEAL→MOVE→PARKED 单页场景，390×844，1/1 通过，14.1s。三阶段布局身份依次更新且各层一致；停放后 H4 回到桌面中心带，与真实作者牌、PAC 和倒计时不重叠。真实牌保持 90×135 翻开，停放位置匹配作者座位。
- 上一有界步骤的 Raining Arrows 已提交无懈可击历史场景：1/1 通过，8.9s；观察者切换和刷新后只显示真实已提交牌，私密失败意图未出现。
- 当前回合 UI 浏览器检查共使用上述单场景；没有执行多设备/多玩家矩阵或重复重试。以上均是本地测试，不代表 owner iPhone 验收。

### 设计文档更新

已复核远端设计基线 ba7ee751cb2d15cfcd406b1552cd29800451d685。当前文档更新只修正 T6/T3 状态、保留此前手机失败作为未解除证据，并删除相关源码执行清单，保留可复用的产品与布局约定。2026-11-03 01:40 UTC 的首次 git diff --check 检出 HANDOVER 标题行末空格；已清理。2026-11-03 01:41 UTC 再次运行 `git diff --check`，通过。

### 唯一待办

由 owner 对当前已部署版本执行 §10.30 的单次 iPhone 复验：检查 Raining Arrows/Barbarian Invasion 的 H4→真实卡牌→PAC 顺序、Gan Ning 转换与公开 Lightning 结算、提交无懈可击后的作者缩略历史，以及 T2/T5/Console/隐私回归边界。报告 PASS / PARTIAL PASS / FAIL 后再更新设计状态。T5 已接受并关闭；不得将 T6 标为接受，除非 owner 明确给出完整 PASS。
