# HANDOVER — 当前唯一任务

## §10.58 SERPENT-SPEAR-FULL-CONTROL-LABEL-01

**状态（2026-11-15 19:47 UTC）：** IMPLEMENTED LOCALLY / FOCUSED VALIDATION PASSED / REMOTE DELIVERY PENDING. 不代表用户验收。

**设计版本：** `docs/UX2-refine.md` revision `2026-11-15 19:47 UTC`。仅修复真实武器名称呈现与手机按钮可读性；玩法、服务端权限、手牌身份和合法两卡 `AS ATTACK` 不变。完整执行要求仍见 §10.58。

**实现：** `app/page.tsx` 从 `cardDefinition("SerpentSpear").name` 统一完整名称，修复 response/provider 标签、Console 摘要与 Play 阶段模式按钮；模式按钮有明确的 `Use Serpent Spear` / `Exit Serpent Spear mode` accessible label 和 `aria-pressed`。`app/sequence-overrides.css` 只为该武器按钮允许自然换行并保持最小 44px 高度。未改服务器和规则。

**验证时间线（UTC，按实际执行顺序）：**

- 19:40 前后，第一次 Playwright 场景失败：Worker fixture 使用构建产物 `dist`，测试当时读到旧按钮 “Spear”。
- 随后 `npm run build` 通过；仅有既存大 chunk 与动态路由分类提示。
- 第二次 Playwright 探索扩展场景失败在额外构造的 Duel fixture：该夹具没有生成投影的 `serpent_spear_attack` 选项。移除此不代表真实服务端状态的补充场景，将 provider 标签覆盖移到 GameRoom 组件测试；未改造规则或降低现有 API 断言。
- `node --import tsx --test --test-name-pattern='Serpent Spear' tests/active-skill-interactions.test.mjs`：2/2 通过；覆盖模式的完整/退出名称、pressed 状态、真实两卡流程保留，以及 CurrentAction 未投影时不自行生成响应入口。
- 最终手机浏览器场景：`npx playwright test --config tests/browser/playwright.config.mjs tests/browser/hero-event-triggers-real-gameplay.spec.mjs --grep 'Serpent Spear presents two real cards as one Attack' --workers=1`：1/1 通过，390×844；确认完整名称、44px 高度、≥7px 字号、无文字溢出、模式切换状态、未装备玩家无按钮，既有真实两张手牌组成 Attack 与响应权限保持通过。三次浏览器启动总耗时约 32 秒，低于每任务 5 分钟上限。
- `git diff --check` 在最后文档更新前通过；需再对最终 diff 运行一次。

**下步（本任务仍未交付）：** 复核最终 diff 与最新 `origin/ux-v2` HEAD 的 Actions；提交并推送本任务文件，等待实现精确 SHA 的全部 CI、Worker 部署及生产 smoke。用户最新指示称 §10.49 与 §10.51 均验收失败；本 handover 不提前切换任务，完成 §10.58 交付后按顺序重审 §10.49、§10.51。两者的最新失败细节尚未包含在当前指示中，不作猜测性修复。手机验收仍待用户进行。
