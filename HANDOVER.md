# HANDOVER — 当前唯一任务

## 周瑜英姿 — 摸牌阶段公开等待提示

**状态：已推送；CI 的 API job 失败，部署被跳过，正在修复。** 源提交 `a7d3163e8129a36598c0760999747dcc4dad5016`，精确 SHA [Actions 43130769779](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43130769779)。用户要求英姿决策期间所有玩家看到周瑜的回合和等待其使用技能或跳过；`docs/UX2-refine.md` §10.37 的 2026-11-12 用户要求已记录。主目录原有未提交文件未触碰。

**研究结果与方案：** 仓库规则和 `beginDrawPhaseDecision()` 已在服务器打开真正的摸牌阶段决定；既有 API 测试覆盖未决时不摸、接受英姿摸三张、跳过摸两张。截图中的 `Resolving…` 是公开决策投影缺少该阶段的证明。由服务器从当前 `draw_phase` pending、玩家、公开能力选项及隐私规则生成共享的、最小的公开决策投影；PAC 显示真实回合玩家与“等待使用公开技能或 Skip”，所有玩家一致。只展示公开能力，私有机会及手牌信息不得泄露；法律动作、计时和摸牌规则保持服务器权威。

**00:53 UTC 结果：** 服务器将当前真实 Draw Phase 的公开能力选项投影到 `PresentationSnapshot`；PAC 显示真实回合玩家及等待使用技能或 Skip。单位测试 20/20 通过；基于本地 Worker/D1 的单个 API 测试文件 26/26 通过，包括两视角一致、选择前不摸牌、Skip 两张、Heroic 三张和结束后移除提示；手机 440×766 双视角场景 1/1 通过（5.6 秒）。首次 UI 断言仅因 0.016px 小数取整失败，使用 0.5px 几何容差后通过。`npm run build` 通过；`git diff --check` 通过。额外 `tsc --noEmit` 因项目已有大量类型配置/Cloudflare 类型错误失败；已排除本次新增投影的隐式 any，正式门禁为仓库 Actions。

**00:54 UTC：** 已提交并推送。**00:57 UTC：** Lint/fast 与 Browser smoke 通过，API job 失败、部署跳过：普通场景中路由额外附加 `publicDrawPhaseDecision: null`，但 `composePresentationSnapshot()` 不包含该字段，破坏既有快照一致性断言。需将该公开字段纳入统一快照组合与验证，重跑受影响 API 文件后提交 CI 修复；CI 未恢复前不得开始其他任务。

**01:00 UTC CI 修复：** 公开 Draw Phase 字段现由统一快照组合函数校验、复制且剔除额外私有字段；路由通过该函数传入。重新 build 成功；快照与公共提示快速测试 44/44 通过；失败的引擎投影文件及周瑜所在 API 文件共 71/71 通过（13.98 秒）。待提交此修复并等待新 SHA 全部必需 CI/部署。
