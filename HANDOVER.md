# HANDOVER — 当前唯一任务

## FANJIAN-PUBLIC-H4-SETTLEMENT-CONTINUITY-01 / §10.42

**状态：实现和聚焦验证完成；待精确 SHA CI、Worker 部署及生产 smoke。** 交付状态须为 `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`。未做 owner iPhone 验收。

**设计基线：** `docs/UX2-refine.md` §10.42，revision `2026-11-12 19:34 UTC`。分支：`codex/ux2-judgement-seat-01`，目标远端 `origin/ux-v2`。代码基线 `5d434b9e1868d761d99e69b043748141fafac240`。实现尚未提交。

### 根因

1. 真实 E16 HAND→HAND 卡牌从来源座位直线飞入中央，轨迹穿过首张缩略卡区域及固定 H4。碰撞求解器因此短暂找不到可用 H4 落点，隐藏 H4；卡牌离开后 H4 又出现。owner trace 记录隐藏区间约 0.17 秒，障碍类型为三个 `journey-target`。
2. 最终反间 H4 只跟随 `activeSkillEffectSettlement` 的 600ms 技能卡框清理。当状态清除后，同一 root 中较晚的 damage fact 重新成为 H4，令完整结果退回伤害文案。
3. 440px / 474px fixture 中的首停车位回退几何为 top=186px、slot bottom=178px、间隙8px。该 fixture 没有预存 parked miniature；存在实际 parked miniature 时，现有定位器读取其真实 DOMRect。本任务没有把原本正确的回退值误判为完整卡牌尺寸。

### 已完成修改

- settlement 卡框在 600ms 后结束视觉展示，但保留已验证的 settlement owner；完整 H4 持续使用同一结算 proof，不退回 damage/reveal 事实。更新的独立公开出牌仍通过原 arbitration 接管 H4。未改 `CurrentAction`、服务器规则、行动权限、私密信息或游戏计时。
- 有固定上部 H4 时，真实 HAND→HAND 卡牌按 H4 与上排首张真实 miniature/停车位边界计算可用侧道；卡牌以缩略比例绕过，再在 H4 下方中央放大展示，之后从安全侧边进入收件人手牌。保持真实卡牌身份和单一 E16 transition owner；空间不足时保留原安全路径。

### 执行与验证记录（UTC）

- 20:53 — 首次浏览器命令漏传仓库 Playwright config，因缺少 `baseURL` 在导航前失败，未启动页面。修正配置后复现 H4 闪隐；随后修正测试中 transition DOM 属性的选择器，才采集真实卡牌几何。
- 约21:10 — 440px 宽、474px 战场单场测试通过：H4 最终文案与 copy key 稳定超过3秒并在3.5秒采样末仍可见；首停车位间距满足4–8px；真实 E16 CardFace 全程绕过 H4 和首张 miniature，无重叠；切换旁观玩家后文案和 copy key 不变。
- 约21:11 — 既有 §10.41 Attack/Steal takeover 浏览器回归通过，较新的公开出牌仍接管 H4。
- 约21:17 — 收敛 settlement 保留状态后重跑上述两个浏览器用例：分别 9.5 秒、5.9 秒，均通过。整个任务本地 UI/browser 测试总计不到1分钟，低于5分钟上限。
- 约21:18 — `node --import tsx --test tests/public-card-announcement.test.mjs`：28/28通过，覆盖公开出牌接管 Fanjian 结果。
- 约21:18 — `npx eslint app/page.tsx` 通过，0 errors、2 warnings。基线临时副本同样为0 errors、2 warnings。此前第一次针对性 lint 因在巨型 `GameRoom` 控制流图新增条件而触发 `react-hooks/rules-of-hooks` 栈溢出；已简化该状态控制并再次 lint 成功。临时副本已删除。
- 21:20 — 再次 fetch `origin/ux-v2`，远端仍为基线 `5d434b9e`，没有代码漂移；提交前 `git diff --check` 通过。最新 push-triggered Actions 已完成且成功，但只验证旧部署代码 SHA `0581448e906ae7406c24e98b525f4ab5e9f031be`（[run 43195310553](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43195310553)）；本任务 SHA 尚无 CI 结果。

### 当前交付状态

任务文件仅为 `app/page.tsx`、`app/sequence-overrides.css`、`tests/browser/public-h4-cardface-recency.spec.mjs` 和本 HANDOVER。尚未提交或 push。最近远端代码 SHA `0581448e906ae7406c24e98b525f4ab5e9f031be` 的 Actions 成功；本任务 SHA 尚不存在。Build、精确 SHA Actions、Worker version/deployment、生产 health smoke 均未验证。

### 唯一下一步

复核最终差异并执行 `git diff --check`；确认提交前 CI 状态仍健康；提交并推送 §10.42。等待该精确 SHA 所有 GitHub Actions、Worker 部署和生产 health smoke 完成。成功后更新设计状态及本 HANDOVER 为 `IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW`，再按用户指示创建 §10.43 的单任务交接。
