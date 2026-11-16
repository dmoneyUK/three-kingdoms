# HANDOVER — 唯一当前任务：§10.59 普通卡牌摸牌结果发布

**状态：服务端来源集成继续中；当前仅处理 Draw Two 实际摸牌结果。** 最新设计 revision：`2026-11-16 01:34 UTC`。Owner 负责实际游戏/手机验收；按 Owner 指示，不运行本地实际测试、构建或设备测试。远端精确 SHA CI、部署和生产 smoke 依项目交付要求执行。

## 最近交付

§10.59 HP 恢复来源：SHA `2935944ef5ae6d8ddd04bd8415b05d07b856eb38`，[Actions 43805162032](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43805162032) 全绿，Worker `86ad7de5-d9d2-41ca-ac64-dc23e9df6ab3`。共享弃牌结果来源：SHA `3d31d75ce2f313ed54073de1663819eb1d9b52ff`，[Actions 43807417483](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43807417483) 全绿，Worker `6761ad50-5f6a-46bd-b491-cceb0cbfea06`，生产 smoke/health 通过。该切片将已验证的分组物理弃牌按 HAND / EQUIPMENT / JUDGEMENT 来源区汇总为 `CARD_DISCARDED`，并扩展 proof validator；首次 run 43806842711 因单卡装备替换兼容性失败，已在最终 SHA 修复。普通 Draw Phase 实际数量事实已由 `685383dc` 接入并随上述版本部署。Agent 未运行本地测试、构建、浏览器或设备测试。

范围限制：恢复续接若带 causal context、但日志不能唯一证明公开根事件，则 fail closed，不猜 `rootEventId`。弃牌 facts 已有服务端 typed proof，但统一 H4 消费/所有权仲裁仍未完成；§10.59 未验收。

## 当前边界

在 `resolveDeferredStratagem` 的 `draw_two` 结算中，将服务端实际 `draw.drawn.length` 接入同一通用公共结果合同：仅公开实际数量，不公开抽到的卡牌身份；优先复用已验证的原互动/根事件因果。若旧 continuation 缺少可验证根，则以结果事件自身作为新根，只发布 actor 与实际数量，不猜原卡/因果。只有成功结算时才持久化结果。保留既有规则、私密手牌和 CardFace/Negation 顺序；不接入其他抽牌路径，也不改 H4 UI/仲裁。

**操作记录（2026-11-16 UTC）：** 05:10 复核发现普通 Draw Phase 已由 `685383dc` 接入；将当前范围限定为尚缺真实数量事实的公共 Draw Two 结算。05:14 在 `resolveDeferredStratagem` 以服务端 `draw.drawn.length` 写通用 `EFFECT_APPLIED / CARD_DRAWN` 结果，抽到的卡牌身份不进公共事实；因果根可验证时沿用原根，否则以结果事件自为根、只述 actor/count。把结果日志与手牌/牌堆状态放入同一结算 batch。05:15 推送 SHA `63985483b7b8ae4c0314e238e814bdc30057084a`；精确 Actions [43809038369](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43809038369) 中 lint/fast 与 browser startup smoke 通过，API tests 失败、deploy 跳过。失败断言要求保留原 `presentation:false` 历史行及旧消息；05:21 已修正为保留该历史行，同时由单独 committed public event 承担真实抽牌结果 H4，避免改变历史行契约。05:23 推送 SHA `44e10e2aee9482f6a2f13bddcc8798bba06d51af`；Actions [43809756262](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43809756262) 的 lint/fast 与 browser smoke 通过，但 API tests 又指出 H4 事件文案与保留的历史文案重复命中“draws 2 cards”计数；05:26 已改成由 structured committed outcome 承载数量，展示事件仅作通用结算标记。两轮均未运行本地测试、构建、浏览器、对局或设备测试；最新修正提交、精确 SHA CI/部署待执行。

完成后不运行本地实际测试；检查 diff、提交推送并验证精确 SHA CI、部署和生产 smoke。Owner 手动验收，不标记 USER-ACCEPTED。
