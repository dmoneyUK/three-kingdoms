# HANDOVER — 当前唯一任务：§10.60 Step 1 手牌间距修复

**最近交付结果：§10.56 OPPONENT-INSPECTOR-SEAT-ANCHOR-01 返修已实现并部署，仍待 Owner iPhone 复验。** Commit `c290f9f2b775f36a47e5027055efc2e2af23d3f8`；精确 SHA [Actions 43775398370](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43775398370) 全绿（浏览器启动/房间 smoke、lint/fast、API、D1/deploy）；Worker `4e7bb0aa-f538-4652-837e-4a4d09e09b3d`；线上 `/` HTTP 200、`/api/health` 返回 `{"ok":true,"worker":"available"}`。聚焦手机回归 1/1，7.9 秒，确认选中 Xiahou Dun 时 Inspector 起点距 Seat 底部 `8±2px`、Inspector 可盖住但不移动 H4、且不碰其他受保护区。不得标为用户验收通过。

## 当前任务与设计基线

当前唯一任务为 `docs/UX2-refine.md` §10.60 `LOCAL-HAND-OVERLAP-TOUCH-SWIPE-01` 的 Step 1（文档修订依据：最新远端 `origin/ux-v2` `b580b5f6e88281ce99ad2107d59ad98714040082`，Revision 2026-11-15 23:33 UTC；最新两笔提交只更新设计文档，§10.60 条款未变）。§10.60 要求保留 68px 真实卡面、艺术/文字/花色和顺序；相邻未选卡片的水平步进至少为卡面宽度的 75%（68px 面宽时至少 51px，最多遮挡 25%），按响应式实际宽度比例计算，不缩小卡片或截断信息；拥挤的 440px、约 11 张牌场景需证明下限。

## 本步骤状态与验收

**2026-11-15 23:42 UTC：本地实现完成，待提交/精确 SHA CI/部署。** `calculateHandCardStep` 使用实际卡宽的 75% 下限；测量 Rail 的 CSS `--hand-card-face-width` 并用于布局步进、溢出判断和负 margin，因此 56px 短屏卡面按 42px 下限计算。保留真实卡牌尺寸、信息与顺序；拥挤牌列由既有原生横向溢出承载。定向测试 `node --import tsx --test --test-name-pattern="hand cards keep at least 75%" tests/room-safety-render.test.mjs`：1/1 通过；`git diff --check` 通过。未运行 UI/browser。仅修改 `app/page.tsx` 与其现有快速纯逻辑/布局断言；不改触摸滚动和手牌交互。完成此 Step 1 的精确 SHA CI/部署后，再将 HANDOVER 切到 Step 2（真实手势复现/命中测试及最小原生滚动修复）。

保留当前唯一任务编号 §10.60；最终仍需按设计完成 Step 2、Step 3（最后一张完整可达、手势不误触、点击选择正确）以及 exact-SHA CI、部署和生产 smoke。不得自我验收，Owner iPhone review 仍是最终验收门槛。
